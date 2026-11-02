package services

import "sync"

// chainLocks serializa dentro del proceso los cierres que extienden la cadena SHA-256 de un mismo paciente.
// Entre procesos distintos la unicidad la garantiza el indice unico (paciente, hash previo) y el reintento.
var chainLocks sync.Map

// lockPatientChain bloquea la cadena del paciente y retorna la funcion que la libera.
func lockPatientChain(patientID string) func() {
	value, _ := chainLocks.LoadOrStore(patientID, &sync.Mutex{})
	mu := value.(*sync.Mutex)
	mu.Lock()
	return mu.Unlock
}
