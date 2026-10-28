module saludconecta-tests

go 1.22

require (
	github.com/google/uuid v1.6.0
	saludconecta-backend v0.0.0
)

replace saludconecta-backend => ../../src/backend
