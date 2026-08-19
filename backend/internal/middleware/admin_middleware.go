package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/jwt"
)

const AdminRole = "admin"

type AdminClaims interface {
	GetRole() string
}

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {

		claimsValue, exists := ctx.Get("user")

		if !exists {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Authorization token is missing in context"})
			return
		}
		claims, ok := claimsValue.(*jwt.Claims)

		if !ok {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Invalid user context data"})
			return
		}

		if strings.ToLower(claims.Role) != AdminRole {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "You don't have permission to access this resource",
			})
			return
		}

		ctx.Next()
	}
}
