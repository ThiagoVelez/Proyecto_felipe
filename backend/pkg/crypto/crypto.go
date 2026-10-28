package crypto

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidToken = errors.New("token JWT invalido o expirado")
	ErrInvalidTOTP  = errors.New("codigo TOTP invalido")
)

// JWTClaims encapsula la informacion de identidad en el token de acceso.
type JWTClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// HashPassword genera un hash seguro utilizando bcrypt con coste 12.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword compara una contrasena en texto plano contra su hash bcrypt.
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ComputeSHA256 calcula la representacion hexadecimal de la suma SHA-256 de una cadena.
func ComputeSHA256(data string) string {
	sum := sha256.Sum256([]byte(data))
	return hex.EncodeToString(sum[:])
}

// CalculateChainedRecordHash genera el hash SHA-256 encadenado garantizando inmutabilidad.
// Combina el hash del folio previo con los datos clinicos determinantes del folio actual.
func CalculateChainedRecordHash(previousHash, patientID, doctorID, anamnesis, physicalExam, cie11, diagnosis, plan, closedAt string) string {
	normalized := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s|%s|%s",
		strings.TrimSpace(previousHash),
		strings.TrimSpace(patientID),
		strings.TrimSpace(doctorID),
		strings.TrimSpace(anamnesis),
		strings.TrimSpace(physicalExam),
		strings.TrimSpace(cie11),
		strings.TrimSpace(diagnosis),
		strings.TrimSpace(plan),
		strings.TrimSpace(closedAt),
	)
	return ComputeSHA256(normalized)
}

// GenerateJWT firma un nuevo token de sesion con vigencia configurable.
func GenerateJWT(userID, role, email, secret string, ttl time.Duration) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		Role:   role,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "saludconecta-ips",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateJWT valida la firma y vigencia del token extrayendo sus claims.
func ValidateJWT(tokenStr, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metodo de firma inesperado: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// GenerateMFASecret crea una nueva clave secreta aleatoria en Base32 para TOTP.
func GenerateMFASecret() (string, error) {
	secretBytes := make([]byte, 20)
	if _, err := rand.Read(secretBytes); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secretBytes), nil
}

// VerifyTOTP valida un codigo numerico de 6 digitos contra el secreto base32 segun RFC 6238.
// Permite una ventana de tolerancia de +/- 1 intervalo (30 segundos).
func VerifyTOTP(secret string, code string) bool {
	secret = strings.ToUpper(strings.ReplaceAll(secret, " ", ""))
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		return false
	}

	currentTime := time.Now().Unix()
	step := int64(30)
	currentInterval := currentTime / step

	for offset := int64(-1); offset <= 1; offset++ {
		interval := currentInterval + offset
		buf := make([]byte, 8)
		binary.BigEndian.PutUint64(buf, uint64(interval))

		mac := hmac.New(sha1.New, key)
		mac.Write(buf)
		hash := mac.Sum(nil)

		offsetIndex := hash[len(hash)-1] & 0x0f
		binaryCode := (int(hash[offsetIndex])&0x7f)<<24 |
			(int(hash[offsetIndex+1])&0xff)<<16 |
			(int(hash[offsetIndex+2])&0xff)<<8 |
			(int(hash[offsetIndex+3]) & 0xff)

		expectedCode := fmt.Sprintf("%06d", binaryCode%1000000)
		if expectedCode == code {
			return true
		}
	}

	return false
}

