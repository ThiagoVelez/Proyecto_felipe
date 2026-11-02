package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func eventos(t *testing.T, evs ...evento) string {
	t.Helper()
	var b strings.Builder
	for _, e := range evs {
		if e.Package == "" {
			e.Package = "saludconecta-tests"
		}
		linea, err := json.Marshal(e)
		if err != nil {
			t.Fatal(err)
		}
		b.Write(linea)
		b.WriteByte('\n')
	}
	return b.String()
}

func falloConMarca(prueba, id string) []evento {
	return []evento{
		{Action: "run", Test: prueba},
		{Action: "output", Test: prueba, Output: "    x_test.go:10: DEFECTO-REPRODUCIDO " + id + ": comportamiento incorrecto\n"},
		{Action: "fail", Test: prueba},
	}
}

func evaluarEntrada(t *testing.T, lista []defecto, entrada string, conRace bool) []veredicto {
	t.Helper()
	ej, err := leerEjecucion(strings.NewReader(entrada))
	if err != nil {
		t.Fatal(err)
	}
	return evaluar(lista, ej, conRace)
}

var listaBase = []defecto{
	{ID: "DEF-06", Prueba: "TestDEF06", Tipo: tipoMarcador},
	{ID: "DEF-37", Prueba: "TestDEF37", Tipo: tipoCarrera},
}

func TestReproduccionEsperadaPasaEnVerde(t *testing.T) {
	evs := falloConMarca("TestDEF06", "DEF-06")
	evs = append(evs,
		evento{Action: "run", Test: "TestDEF37"},
		evento{Action: "output", Test: "TestDEF37", Output: "WARNING: DATA RACE\n"},
		evento{Action: "output", Test: "TestDEF37", Output: "    testing.go:1867: race detected during execution of test\n"},
		evento{Action: "fail", Test: "TestDEF37"},
	)
	for _, v := range evaluarEntrada(t, listaBase, eventos(t, evs...), true) {
		if v.EsError || v.Estado != "reproducido" {
			t.Errorf("%s: se esperaba reproducido y se obtuvo %s (%s)", v.ID, v.Estado, v.Mensaje)
		}
	}
}

func TestPruebaQuePasaIndicaDefectoCorregido(t *testing.T) {
	entrada := eventos(t, evento{Action: "run", Test: "TestDEF06"}, evento{Action: "pass", Test: "TestDEF06"})
	v := evaluarEntrada(t, listaBase[:1], entrada, true)[0]
	if !v.EsError || v.Mensaje != "DEF-06 parece corregido: verifícalo y ciérralo en la bitácora" {
		t.Fatalf("mensaje inesperado: %+v", v)
	}
}

func TestFalloSinMarcaEsCausaDistinta(t *testing.T) {
	entrada := eventos(t,
		evento{Action: "run", Test: "TestDEF06"},
		evento{Action: "output", Test: "TestDEF06", Output: "    x_test.go:5: No se pudo crear el paciente\n"},
		evento{Action: "fail", Test: "TestDEF06"},
	)
	v := evaluarEntrada(t, listaBase[:1], entrada, true)[0]
	if !v.EsError || !strings.Contains(v.Mensaje, "causa distinta") {
		t.Fatalf("se esperaba error por causa distinta: %+v", v)
	}
}

func TestMarcaDeOtroDefectoNoCuenta(t *testing.T) {
	v := evaluarEntrada(t, listaBase[:1], eventos(t, falloConMarca("TestDEF06", "DEF-07")...), true)[0]
	if !v.EsError {
		t.Fatalf("la marca de otro defecto no debe aceptarse: %+v", v)
	}
}

func TestPanicoEsError(t *testing.T) {
	entrada := eventos(t,
		evento{Action: "run", Test: "TestDEF06"},
		evento{Action: "output", Test: "TestDEF06", Output: "DEFECTO-REPRODUCIDO DEF-06: x\n"},
		evento{Action: "output", Test: "TestDEF06", Output: "panic: runtime error: invalid memory address\n"},
		evento{Action: "fail", Test: "TestDEF06"},
		evento{Action: "output", Output: "FAIL\tsaludconecta-tests\t0.1s\n"},
		evento{Action: "fail"},
	)
	vs := evaluarEntrada(t, listaBase, entrada, true)
	if !vs[0].EsError || !strings.Contains(vs[0].Mensaje, "panico") {
		t.Errorf("DEF-06: se esperaba error por panico: %+v", vs[0])
	}
	if !vs[1].EsError || !strings.Contains(vs[1].Mensaje, "no se ejecuto") {
		t.Errorf("DEF-37: se esperaba error por prueba no ejecutada: %+v", vs[1])
	}
}

func TestErrorDeCompilacionEsError(t *testing.T) {
	entrada := eventos(t,
		evento{Action: "build-output", Output: "./x_test.go:3:2: undefined: algo\n"},
		evento{Action: "build-fail"},
		evento{Action: "fail", FailedBuild: "saludconecta-tests"},
	)
	for _, v := range evaluarEntrada(t, listaBase, entrada, true) {
		if !v.EsError || !strings.Contains(v.Mensaje, "no compilaron") {
			t.Errorf("%s: se esperaba error de compilacion: %+v", v.ID, v)
		}
	}
}

func TestCarreraNoDeclaradaEsError(t *testing.T) {
	evs := falloConMarca("TestDEF06", "DEF-06")
	evs = append(evs[:2], evento{Action: "output", Test: "TestDEF06", Output: "WARNING: DATA RACE\n"}, evs[2])
	v := evaluarEntrada(t, listaBase[:1], eventos(t, evs...), true)[0]
	if !v.EsError || !strings.Contains(v.Mensaje, "carrera no declarada") {
		t.Fatalf("se esperaba error por carrera no declarada: %+v", v)
	}
}

func TestCarreraSinRaceNoEsEvaluable(t *testing.T) {
	entrada := eventos(t, evento{Action: "run", Test: "TestDEF37"}, evento{Action: "pass", Test: "TestDEF37"})
	v := evaluarEntrada(t, listaBase[1:], entrada, false)[0]
	if v.EsError || v.Estado != "no evaluable" {
		t.Fatalf("sin -race el defecto de carrera no debe evaluarse: %+v", v)
	}
	v = evaluarEntrada(t, listaBase[1:], entrada, true)[0]
	if !v.EsError || !strings.Contains(v.Mensaje, "parece corregido") {
		t.Fatalf("con -race una prueba de carrera que pasa indica correccion: %+v", v)
	}
}

func TestPruebaOmitidaEsError(t *testing.T) {
	entrada := eventos(t, evento{Action: "run", Test: "TestDEF06"}, evento{Action: "skip", Test: "TestDEF06"})
	if v := evaluarEntrada(t, listaBase[:1], entrada, true)[0]; !v.EsError {
		t.Fatalf("una prueba omitida no reproduce el defecto: %+v", v)
	}
}

func TestSubpruebasSeAtribuyenALaPrincipal(t *testing.T) {
	entrada := eventos(t,
		evento{Action: "run", Test: "TestDEF06"},
		evento{Action: "output", Test: "TestDEF06/caso", Output: "DEFECTO-REPRODUCIDO DEF-06: x\n"},
		evento{Action: "fail", Test: "TestDEF06/caso"},
		evento{Action: "fail", Test: "TestDEF06"},
	)
	if v := evaluarEntrada(t, listaBase[:1], entrada, true)[0]; v.EsError {
		t.Fatalf("la marca en una subprueba debe contar: %+v", v)
	}
}

func TestCoherenciaConBitacoraYFuente(t *testing.T) {
	estados := map[string]string{"DEF-06": "Confirmado", "DEF-37": "En verificación (corregido en rama)"}
	fuente := map[string]string{"TestDEF06": "DEF-06", "TestDEF37": "DEF-37", "TestDEF99": "DEF-99"}
	problemas := strings.Join(verificarCoherencia(listaBase, estados, fuente), "\n")
	for _, esperado := range []string{"DEF-37 figura como «En verificación", "TestDEF99 (DEF-99) usa requireDefectoAbierto pero no esta en la lista"} {
		if !strings.Contains(problemas, esperado) {
			t.Errorf("falta el problema %q en:\n%s", esperado, problemas)
		}
	}
	if strings.Contains(problemas, "DEF-06") {
		t.Errorf("DEF-06 es coherente y no debe reportarse:\n%s", problemas)
	}
}

func TestLeerListaRechazaFormatoInvalido(t *testing.T) {
	casos := []string{
		"DEF-06 TestDEF06",
		"DEF6 TestDEF06 marcador",
		"DEF-06 TestDEF06 otro",
		"DEF-06 TestDEF06 marcador\nDEF-06 TestOtra marcador",
		"# solo comentarios",
	}
	for _, c := range casos {
		if _, err := leerLista(strings.NewReader(c)); err == nil {
			t.Errorf("se esperaba error para %q", c)
		}
	}
}

func TestEstadosEnBitacora(t *testing.T) {
	tabla := "| ID | Título | Módulo | Severidad | Prioridad | Estado |\n|---|---|---|---|---|---|\n" +
		"| DEF-06 | Omitir la reactividad | Backend | Crítica | P1 | Confirmado |\n" +
		"| DEF-05 | Permitir `patient_id` | Backend | Crítica | P1 | En verificación (corregido en rama) |\n" +
		"| DEF-29 | Producir colisiones por separador `\\|` sin escapar | Backend | Media | P3 | Confirmado |\n"
	estados, err := estadosEnBitacora(strings.NewReader(tabla))
	if err != nil {
		t.Fatal(err)
	}
	if estados["DEF-06"] != "Confirmado" || !strings.HasPrefix(estados["DEF-05"], "En verificación") || estados["DEF-29"] != "Confirmado" {
		t.Fatalf("estados leidos incorrectamente: %v", estados)
	}
}

func TestEjecutarExtremoAExtremo(t *testing.T) {
	dir := t.TempDir()
	escribir := func(nombre, contenido string) string {
		ruta := filepath.Join(dir, nombre)
		if err := os.WriteFile(ruta, []byte(contenido), 0o600); err != nil {
			t.Fatal(err)
		}
		return ruta
	}
	lista := escribir("lista.txt", "DEF-06 TestDEF06 marcador\n")
	bitacora := escribir("bitacora.md", "| DEF-06 | Titulo | Backend | Crítica | P1 | Confirmado |\n")
	fuente := escribir("fuente_test.go", "func TestDEF06(t *testing.T) {\n\trequireDefectoAbierto(t, \"DEF-06\")\n}\n")
	args := []string{"-lista", lista, "-bitacora", bitacora, "-fuente", fuente, "-con-race"}

	var salida bytes.Buffer
	if codigo := ejecutar(args, strings.NewReader(eventos(t, falloConMarca("TestDEF06", "DEF-06")...)), &salida); codigo != 0 {
		t.Fatalf("se esperaba codigo 0 y se obtuvo %d:\n%s", codigo, salida.String())
	}

	salida.Reset()
	pasa := eventos(t, evento{Action: "run", Test: "TestDEF06"}, evento{Action: "pass", Test: "TestDEF06"})
	if codigo := ejecutar(args, strings.NewReader(pasa), &salida); codigo != 1 || !strings.Contains(salida.String(), "DEF-06 parece corregido") {
		t.Fatalf("se esperaba codigo 1 con aviso de correccion; codigo %d:\n%s", codigo, salida.String())
	}

	salida.Reset()
	if codigo := ejecutar(append(args, "-regex"), strings.NewReader(""), &salida); codigo != 0 || strings.TrimSpace(salida.String()) != "^(TestDEF06)$" {
		t.Fatalf("regex inesperada: %q", salida.String())
	}
}
