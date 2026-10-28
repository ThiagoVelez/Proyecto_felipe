package interoperability

import (
	"context"
	"encoding/json"
	"fmt"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// RIPSGenerator implementa ports.RIPSGeneratorPort para cumplimiento de la Resolucion 2275 de 2023 de MinSalud.
type RIPSGenerator struct {
	ipsNIT  string
	codPrestador string
}

// NewRIPSGenerator crea un adaptador generador de facturacion electronica en salud y RIPS JSON.
func NewRIPSGenerator(ipsNIT, codPrestador string) ports.RIPSGeneratorPort {
	if ipsNIT == "" {
		ipsNIT = "900123456"
	}
	if codPrestador == "" {
		codPrestador = "110010999901"
	}
	return &RIPSGenerator{
		ipsNIT:       ipsNIT,
		codPrestador: codPrestador,
	}
}

// RIPSJSONEnvelope define la estructura base exigida por la plataforma ministerial de validacion.
type RIPSJSONEnvelope struct {
	NumDocumentoIdObligado string        `json:"numDocumentoIdObligado"`
	NumFactura             string        `json:"numFactura"`
	TipoNota               *string       `json:"tipoNota"`
	NumNota                *string       `json:"numNota"`
	Usuarios               []RIPSUser    `json:"usuarios"`
}

type RIPSUser struct {
	TipoDocumentoIdentificacion string       `json:"tipoDocumentoIdentificacion"`
	NumDocumentoIdentificacion  string       `json:"numDocumentoIdentificacion"`
	TipoUsuario                 string       `json:"tipoUsuario"`
	FechaNacimiento             string       `json:"fechaNacimiento"`
	CodSexo                     string       `json:"codSexo"`
	CodPaisOrigen               string       `json:"codPaisOrigen"`
	PrimerApellido              string       `json:"primerApellido"`
	SegundoApellido             *string      `json:"segundoApellido,omitempty"`
	PrimerNombre                string       `json:"primerNombre"`
	SegundoNombre               *string      `json:"segundoNombre,omitempty"`
	Servicios                   RIPSServices `json:"servicios"`
}

type RIPSServices struct {
	Consultas []RIPSConsulta `json:"consultas,omitempty"`
}

type RIPSConsulta struct {
	CodPrestador            string  `json:"codPrestador"`
	FechaInicioAtencion     string  `json:"fechaInicioAtencion"`
	NumAutorizacion         *string `json:"numAutorizacion,omitempty"`
	CodConsulta             string  `json:"codConsulta"` // Codigo CUPS
	ModalidadGrupoServicio  string  `json:"modalidadGrupoServicio"`
	GrupoServicios          string  `json:"grupoServicios"`
	CodServicio             int     `json:"codServicio"`
	FinalidadTecnologiaSalud string  `json:"finalidadTecnologiaSalud"`
	CausaMotivoAtencion     string  `json:"causaMotivoAtencion"`
	CodDiagnosticoPrincipal string  `json:"codDiagnosticoPrincipal"`
	TipoDiagnosticoPrincipal string  `json:"tipoDiagnosticoPrincipal"`
	VrServicio              float64 `json:"vrServicio"`
}

func (r *RIPSGenerator) GenerateRIPSJSON(
	ctx context.Context,
	invoiceNumber string,
	packageType domain.RIPSPackageType,
	record *domain.ClinicalRecord,
	patient *domain.Patient,
) (string, error) {
	if record == nil || patient == nil {
		return "", fmt.Errorf("los datos del paciente y del folio clinico son requeridos")
	}

	atencionDate := record.CreatedAt.Format("2006-01-02 15:04")
	if record.ClosedAt != nil {
		atencionDate = record.ClosedAt.Format("2006-01-02 15:04")
	}

	consulta := RIPSConsulta{
		CodPrestador:            r.codPrestador,
		FechaInicioAtencion:     atencionDate,
		CodConsulta:             "890201", // Consulta de primera vez por medicina general
		ModalidadGrupoServicio:  "01",     // Intramural
		GrupoServicios:          "01",     // Consulta externa / ambulatoria
		CodServicio:             301,      // Medicina general
		FinalidadTecnologiaSalud: "10",     // Diagnostico
		CausaMotivoAtencion:     "38",     // Enfermedad general
		CodDiagnosticoPrincipal: record.CIE11Code,
		TipoDiagnosticoPrincipal: "1",      // Impresion diagnostica / confirmado nuevo
		VrServicio:              45000.00,
	}

	userObj := RIPSUser{
		TipoDocumentoIdentificacion: string(patient.DocumentType),
		NumDocumentoIdentificacion:  patient.DocumentNumber,
		TipoUsuario:                 "01", // Contributivo cotizante
		FechaNacimiento:             patient.BirthDate.Format("2006-01-02"),
		CodSexo:                     string(patient.Gender),
		CodPaisOrigen:               "170", // Colombia
		PrimerApellido:              patient.LastName,
		SegundoApellido:             patient.SecondLastName,
		PrimerNombre:                patient.FirstName,
		SegundoNombre:               patient.SecondName,
		Servicios: RIPSServices{
			Consultas: []RIPSConsulta{consulta},
		},
	}

	envelope := RIPSJSONEnvelope{
		NumDocumentoIdObligado: r.ipsNIT,
		NumFactura:             invoiceNumber,
		Usuarios:               []RIPSUser{userObj},
	}

	payload, err := json.MarshalIndent(envelope, "", "  ")
	if err != nil {
		return "", fmt.Errorf("error serializando RIPS JSON: %w", err)
	}

	return string(payload), nil
}
