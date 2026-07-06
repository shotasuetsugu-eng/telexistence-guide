CREATE TABLE "map_stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"address" text NOT NULL,
	"lat" text NOT NULL,
	"lng" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
