package interoperability

import (
	"context"
	"fmt"
	"time"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

// FHIRMapper implementa ports.FHIRMapperPort para exportar historias clinicas bajo HL7 FHIR Release 4.
type FHIRMapper struct{}

// NewFHIRMapper crea una nueva instancia del transformador FHIR R4.
func NewFHIRMapper() ports.FHIRMapperPort {
	return &FHIRMapper{}
}

func (m *FHIRMapper) MapToFHIRBundle(
	ctx context.Context,
	record *domain.ClinicalRecord,
	patient *domain.Patient,
	prescription *domain.Prescription,
) (map[string]interface{}, error) {
	if record == nil || patient == nil {
		return nil, fmt.Errorf("folio clinico y paciente requeridos para FHIR Bundle")
	}

	fhirGender := "unknown"
	switch patient.Gender {
	case domain.GenderMale:
		fhirGender = "male"
	case domain.GenderFemale:
		fhirGender = "female"
	case domain.GenderOther:
		fhirGender = "other"
	}

	patientResource := map[string]interface{}{
		"resourceType": "Patient",
		"id":           patient.ID,
		"identifier": []map[string]interface{}{
			{
				"use":   "official",
				"system": "urn:oid:minsalud:identificacion",
				"value":  fmt.Sprintf("%s-%s", patient.DocumentType, patient.DocumentNumber),
			},
		},
		"name": []map[string]interface{}{
			{
				"use":    "official",
				"family": patient.LastName,
				"given":  []string{patient.FirstName},
			},
		},
		"gender":    fhirGender,
		"birthDate": patient.BirthDate.Format("2006-01-02"),
	}

	encounterResource := map[string]interface{}{
		"resourceType": "Encounter",
		"id":           "enc-" + record.ID,
		"status":       "finished",
		"class": map[string]interface{}{
			"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
			"code":   "AMB",
			"display": "ambulatory",
		},
		"subject": map[string]interface{}{
			"reference": "Patient/" + patient.ID,
		},
		"participant": []map[string]interface{}{
			{
				"individual": map[string]interface{}{
					"display": record.DoctorName,
				},
			},
		},
		"period": map[string]interface{}{
			"start": record.CreatedAt.Format(time.RFC3339),
		},
	}

	conditionResource := map[string]interface{}{
		"resourceType": "Condition",
		"id":           "cond-" + record.ID,
		"clinicalStatus": map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
					"code":   "active",
				},
			},
		},
		"code": map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  "http://id.who.int/icd/release/11/mms",
					"code":    record.CIE11Code,
					"display": record.DiagnosisDescription,
				},
			},
			"text": record.DiagnosisDescription,
		},
		"subject": map[string]interface{}{
			"reference": "Patient/" + patient.ID,
		},
		"encounter": map[string]interface{}{
			"reference": "Encounter/enc-" + record.ID,
		},
		"note": []map[string]interface{}{
			{
				"text": fmt.Sprintf("Anamnesis: %s. Examen Fisico: %s. Plan: %s", record.Anamnesis, record.PhysicalExam, record.TreatmentPlan),
			},
		},
	}

	entries := []map[string]interface{}{
		{"fullUrl": "urn:uuid:" + patient.ID, "resource": patientResource},
		{"fullUrl": "urn:uuid:enc-" + record.ID, "resource": encounterResource},
		{"fullUrl": "urn:uuid:cond-" + record.ID, "resource": conditionResource},
	}

	if prescription != nil {
		for idx, item := range prescription.Items {
			medName := "Medicamento recetado"
			if item.Medication != nil {
				medName = item.Medication.CommercialName
			}
			medReq := map[string]interface{}{
				"resourceType": "MedicationRequest",
				"id":           fmt.Sprintf("medreq-%s-%d", prescription.ID, idx),
				"status":       "active",
				"intent":       "order",
				"medicationCodeableConcept": map[string]interface{}{
					"text": medName,
				},
				"subject": map[string]interface{}{
					"reference": "Patient/" + patient.ID,
				},
				"dosageInstruction": []map[string]interface{}{
					{
						"text": fmt.Sprintf("%s cada %d horas por %d dias", item.Dosage, item.FrequencyHours, item.DurationDays),
					},
				},
			}
			entries = append(entries, map[string]interface{}{
				"fullUrl":  fmt.Sprintf("urn:uuid:medreq-%s-%d", prescription.ID, idx),
				"resource": medReq,
			})
		}
	}

	bundle := map[string]interface{}{
		"resourceType": "Bundle",
		"id":           "bundle-" + record.ID,
		"type":         "document",
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"entry":        entries,
	}

	return bundle, nil
}

