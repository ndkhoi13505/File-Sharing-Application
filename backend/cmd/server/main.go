package main

import (
	"log"
	"os"

	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/app"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	log.Println("DATABASE_URL =", os.Getenv("DATABASE_URL"))
	cfg := config.NewConfig()
	application := app.NewApplication(cfg)
	application.Run()
}
