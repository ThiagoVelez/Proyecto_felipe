module saludconecta-tests

go 1.22

require saludconecta-backend v0.0.0

require (
	github.com/golang-jwt/jwt/v5 v5.3.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	golang.org/x/crypto v0.24.0 // indirect
)

replace saludconecta-backend => ../../src/backend
