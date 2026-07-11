package repository

import (
	"time"

	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
)

type UserRepository interface {
	FindById(id string, user *domain.User) *utils.ReturnStatus
	FindByEmail(email string, user *domain.User) *utils.ReturnStatus
	FindByCId(cid string, user *domain.UsersLoginSession) *utils.ReturnStatus
	AddTimestamp(id string, cid string) *utils.ReturnStatus
	DeleteTimestamp(id string) *utils.ReturnStatus
}

type AuthRepository interface {
	BlacklistToken(token string, expiredAt time.Time) *utils.ReturnStatus
	IsTokenBlacklisted(token string) (bool, *utils.ReturnStatus)
	Create(user *domain.User) (*domain.User, *utils.ReturnStatus)
	SaveSecret(userID string, secret string) *utils.ReturnStatus
	GetSecret(userID string) (string, *utils.ReturnStatus)
	EnableTOTP(userID string) *utils.ReturnStatus
}
