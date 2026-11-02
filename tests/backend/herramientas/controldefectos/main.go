// Comando controldefectos verifica que las pruebas de los defectos abiertos fallen por la causa
// declarada en docs/calidad/defectos-abiertos.txt. Lee la salida de `go test -json` por la
// entrada estandar. Termina con codigo 1 si una prueba pasa (el defecto parece corregido), si falla
// por otra causa (panico, compilacion, preparacion fallida, carrera no declarada), si no se ejecuto
// o si la lista no es coherente con la bitacora y con el codigo de pruebas.
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"regexp"
	"sort"
	"strings"
)

const (
	tipoMarcador = "marcador"
	tipoCarrera  = "carrera"
	marca        = "DEFECTO-REPRODUCIDO"
)

type defecto struct {
	ID     string
	Prueba string
	Tipo   string
}

type evento struct {
	Action      string
	Package     string
	Test        string
	Output      string
	FailedBuild string
}

type resultadoPrueba struct {
	accion string
	salida strings.Builder
}

type ejecucion struct {
	pruebas         map[string]*resultadoPrueba
	salidaPaquete   strings.Builder
	fallaCompilando bool
}

type veredicto struct {
	ID      string
	Prueba  string
	Estado  string
	Mensaje string
	EsError bool
}

func leerLista(r io.Reader) ([]defecto, error) {
	var lista []defecto
	vistos := map[string]bool{}
	sc := bufio.NewScanner(r)
	for n := 1; sc.Scan(); n++ {
		linea := strings.TrimSpace(sc.Text())
		if linea == "" || strings.HasPrefix(linea, "#") {
			continue
		}
		campos := strings.Fields(linea)
		if len(campos) != 3 {
			return nil, fmt.Errorf("linea %d: se esperaban 3 campos (<ID> <prueba> <tipo>): %q", n, linea)
		}
		d := defecto{ID: campos[0], Prueba: campos[1], Tipo: campos[2]}
		if !regexp.MustCompile(`^DEF-\d+$`).MatchString(d.ID) {
			return nil, fmt.Errorf("linea %d: identificador invalido %q", n, d.ID)
		}
		if d.Tipo != tipoMarcador && d.Tipo != tipoCarrera {
			return nil, fmt.Errorf("linea %d: tipo %q desconocido (use %s o %s)", n, d.Tipo, tipoMarcador, tipoCarrera)
		}
		if vistos[d.ID] || vistos[d.Prueba] {
			return nil, fmt.Errorf("linea %d: %s o %s duplicado", n, d.ID, d.Prueba)
		}
		vistos[d.ID], vistos[d.Prueba] = true, true
		lista = append(lista, d)
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	if len(lista) == 0 {
		return nil, errors.New("la lista de defectos abiertos esta vacia")
	}
	return lista, nil
}

// estadosEnBitacora lee la tabla resumen «| DEF-XX | titulo | modulo | severidad | prioridad | estado |».
func estadosEnBitacora(r io.Reader) (map[string]string, error) {
	estados := map[string]string{}
	fila := regexp.MustCompile(`^\| (DEF-\d+) \|(.*)\|\s*$`)
	sc := bufio.NewScanner(r)
	for sc.Scan() {
		m := fila.FindStringSubmatch(sc.Text())
		if m == nil {
			continue
		}
		// Un «\|» es un pipe literal dentro de la celda (sintaxis de tablas de GitHub), no un separador.
		celdas := strings.Split(strings.ReplaceAll(m[2], `\|`, "\x00"), "|")
		if len(celdas) != 5 {
			continue
		}
		estados[m[1]] = strings.TrimSpace(celdas[4])
	}
	return estados, sc.Err()
}

// pruebasAbiertasEnFuente devuelve las funciones Test que invocan requireDefectoAbierto.
func pruebasAbiertasEnFuente(r io.Reader) (map[string]string, error) {
	pruebas := map[string]string{}
	fn := regexp.MustCompile(`^func (Test\w+)\(`)
	req := regexp.MustCompile(`requireDefectoAbierto\(t, "(DEF-\d+)"\)`)
	actual := ""
	sc := bufio.NewScanner(r)
	for sc.Scan() {
		if m := fn.FindStringSubmatch(sc.Text()); m != nil {
			actual = m[1]
		}
		if m := req.FindStringSubmatch(sc.Text()); m != nil && actual != "" {
			pruebas[actual] = m[1]
		}
	}
	return pruebas, sc.Err()
}

func verificarCoherencia(lista []defecto, estados map[string]string, fuente map[string]string) []string {
	var problemas []string
	listadas := map[string]bool{}
	for _, d := range lista {
		listadas[d.Prueba] = true
		estado, ok := estados[d.ID]
		switch {
		case !ok:
			problemas = append(problemas, fmt.Sprintf("%s no figura en la tabla resumen de la bitacora", d.ID))
		case strings.HasPrefix(estado, "Cerrado"), strings.HasPrefix(estado, "Rechazado"), strings.HasPrefix(estado, "En verificación"):
			problemas = append(problemas, fmt.Sprintf("%s figura como «%s» en la bitacora pero sigue en la lista de defectos abiertos", d.ID, estado))
		}
		if id, ok := fuente[d.Prueba]; !ok {
			problemas = append(problemas, fmt.Sprintf("%s: la prueba %s no existe o no invoca requireDefectoAbierto", d.ID, d.Prueba))
		} else if id != d.ID {
			problemas = append(problemas, fmt.Sprintf("%s: la prueba %s declara %s", d.ID, d.Prueba, id))
		}
	}
	var huerfanas []string
	for prueba, id := range fuente {
		if !listadas[prueba] {
			huerfanas = append(huerfanas, fmt.Sprintf("%s (%s) usa requireDefectoAbierto pero no esta en la lista", prueba, id))
		}
	}
	sort.Strings(huerfanas)
	return append(problemas, huerfanas...)
}

func leerEjecucion(r io.Reader) (*ejecucion, error) {
	ej := &ejecucion{pruebas: map[string]*resultadoPrueba{}}
	dec := json.NewDecoder(r)
	for {
		var e evento
		if err := dec.Decode(&e); errors.Is(err, io.EOF) {
			break
		} else if err != nil {
			return nil, fmt.Errorf("salida de go test -json invalida: %w", err)
		}
		if e.Action == "build-fail" || e.FailedBuild != "" {
			ej.fallaCompilando = true
		}
		if e.Test == "" {
			if e.Action == "output" || e.Action == "build-output" {
				ej.salidaPaquete.WriteString(e.Output)
			}
			continue
		}
		// Las subpruebas se atribuyen a su prueba principal.
		nombre := strings.SplitN(e.Test, "/", 2)[0]
		rp, ok := ej.pruebas[nombre]
		if !ok {
			rp = &resultadoPrueba{}
			ej.pruebas[nombre] = rp
		}
		switch e.Action {
		case "output":
			rp.salida.WriteString(e.Output)
		case "pass", "fail", "skip":
			if e.Test == nombre {
				rp.accion = e.Action
			}
		}
	}
	return ej, nil
}

func evaluar(lista []defecto, ej *ejecucion, conRace bool) []veredicto {
	var res []veredicto
	paquete := ej.salidaPaquete.String()
	for _, d := range lista {
		v := veredicto{ID: d.ID, Prueba: d.Prueba, EsError: true}
		rp, ok := ej.pruebas[d.Prueba]
		salida := ""
		if ok {
			salida = rp.salida.String()
		}
		switch {
		case ej.fallaCompilando:
			v.Estado, v.Mensaje = "error", "las pruebas no compilaron; el defecto no se pudo evaluar"
		case !ok || rp.accion == "":
			v.Estado, v.Mensaje = "error", "la prueba no se ejecuto o no termino (posible panico o timeout anterior)"
			if strings.Contains(paquete, "panic:") {
				v.Mensaje = "la ejecucion termino por un panico antes de completar esta prueba"
			}
		case rp.accion == "skip":
			v.Estado, v.Mensaje = "error", "la prueba se omitio; ejecute con CALIDAD_DEFECTOS_ABIERTOS=1"
		case rp.accion == "pass" && d.Tipo == tipoCarrera && !conRace:
			v.Estado, v.Mensaje, v.EsError = "no evaluable", "requiere -race; ejecucion sin el detector", false
		case rp.accion == "pass":
			v.Estado, v.Mensaje = "corregido?", fmt.Sprintf("%s parece corregido: verifícalo y ciérralo en la bitácora", d.ID)
		case strings.Contains(salida, "panic:"):
			v.Estado, v.Mensaje = "error", "fallo por un panico, no por el defecto"
		case d.Tipo == tipoMarcador && strings.Contains(salida, "WARNING: DATA RACE"):
			v.Estado, v.Mensaje = "error", "el detector reporto una carrera no declarada para este defecto"
		case d.Tipo == tipoMarcador && !strings.Contains(salida, marca+" "+d.ID+":"):
			v.Estado, v.Mensaje = "error", "fallo por una causa distinta al defecto (sin la marca "+marca+" "+d.ID+")"
		case d.Tipo == tipoCarrera && !strings.Contains(salida, "WARNING: DATA RACE"):
			v.Estado, v.Mensaje = "error", "fallo sin que el detector reportara la carrera esperada"
		default:
			v.Estado, v.Mensaje, v.EsError = "reproducido", "falla como se espera", false
		}
		res = append(res, v)
	}
	return res
}

func regexPruebas(lista []defecto) string {
	nombres := make([]string, len(lista))
	for i, d := range lista {
		nombres[i] = d.Prueba
	}
	return "^(" + strings.Join(nombres, "|") + ")$"
}

func abrir(ruta string) (*os.File, error) {
	f, err := os.Open(ruta) //nolint:gosec // ruta provista por el pipeline
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir %s: %w", ruta, err)
	}
	return f, nil
}

func ejecutar(args []string, entrada io.Reader, salida io.Writer) int {
	fs := flag.NewFlagSet("controldefectos", flag.ContinueOnError)
	rutaLista := fs.String("lista", "../../docs/calidad/defectos-abiertos.txt", "lista de defectos abiertos")
	rutaBitacora := fs.String("bitacora", "../../docs/calidad/04-bitacora-defectos.md", "bitacora de defectos")
	rutaFuente := fs.String("fuente", "calidad_defectos_abiertos_regression_test.go", "archivo con las pruebas de defectos abiertos")
	conRace := fs.Bool("con-race", false, "la ejecucion se hizo con el detector -race")
	soloRegex := fs.Bool("regex", false, "solo imprime la expresion para go test -run")
	if err := fs.Parse(args); err != nil {
		return 2
	}

	f, err := abrir(*rutaLista)
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}
	lista, err := leerLista(f)
	_ = f.Close()
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}
	if *soloRegex {
		fmt.Fprintln(salida, regexPruebas(lista))
		return 0
	}

	fb, err := abrir(*rutaBitacora)
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}
	estados, err := estadosEnBitacora(fb)
	_ = fb.Close()
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}
	ff, err := abrir(*rutaFuente)
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}
	fuente, err := pruebasAbiertasEnFuente(ff)
	_ = ff.Close()
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}

	ej, err := leerEjecucion(entrada)
	if err != nil {
		fmt.Fprintln(salida, err)
		return 2
	}

	fallo := false
	for _, p := range verificarCoherencia(lista, estados, fuente) {
		fmt.Fprintf(salida, "::error::Lista de defectos abiertos incoherente: %s\n", p)
		fallo = true
	}

	veredictos := evaluar(lista, ej, *conRace)
	fmt.Fprintln(salida, "| Defecto | Prueba | Resultado | Detalle |")
	fmt.Fprintln(salida, "|---|---|---|---|")
	for _, v := range veredictos {
		fmt.Fprintf(salida, "| %s | %s | %s | %s |\n", v.ID, v.Prueba, v.Estado, v.Mensaje)
	}
	for _, v := range veredictos {
		if v.EsError {
			fmt.Fprintf(salida, "::error title=%s::%s: %s\n", v.ID, v.Prueba, v.Mensaje)
			fallo = true
		}
	}
	if ej.fallaCompilando {
		fmt.Fprintln(salida, "::error::La compilacion de las pruebas fallo; revise la salida de go test")
	}
	if fallo {
		return 1
	}
	reproducidos := 0
	for _, v := range veredictos {
		if v.Estado == "reproducido" {
			reproducidos++
		}
	}
	fmt.Fprintf(salida, "Defectos abiertos reproducidos como se espera: %d de %d", reproducidos, len(lista))
	if pendientes := len(lista) - reproducidos; pendientes > 0 {
		fmt.Fprintf(salida, " (%d no evaluables sin -race)", pendientes)
	}
	fmt.Fprintln(salida, ".")
	return 0
}

func main() {
	os.Exit(ejecutar(os.Args[1:], os.Stdin, os.Stdout))
}
