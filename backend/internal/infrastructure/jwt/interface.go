package jwt

import "github.com/ndkhoi13505/File-Sharing-Application/internal/domain"

type TokenService interface {
	GenerateAccessToken(user domain.User) (string, error)
	ParseToken(tokenString string) (*Claims, error)
}
