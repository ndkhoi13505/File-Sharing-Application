package middleware

import (
	"net/http"
	"strings"

	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/jwt"
	"github.com/gin-gonic/gin"
)

const AdminRole = "admin"

type AdminClaims interface {
	GetRole() string
}

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {

		claimsValue, exists := ctx.Get("user")

		if !exists {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Authorization token is missing in context."})
			return
		}
		claims, ok := claimsValue.(*jwt.Claims) // Thay thế CustomClaims bằng tên struct claims của bạn

		if !ok {
			// Lỗi xảy ra khi ép kiểu
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Invalid user context data."})
			return
		}

		// 3. Kiểm tra vai trò (Role Check)
		// Giả định trường Role trong Claims là 'Role'
		if strings.ToLower(claims.Role) != AdminRole { // Chuyển về chữ thường để so sánh an toàn hơn
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "You don't have permission to access this resource",
			})
			return
		}

		// 4. Nếu là Admin, tiếp tục xử lý request
		ctx.Next()
	}
}
