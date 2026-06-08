-- Integer ids cannot be cast to uuid, so assign a fresh random uuid to every row
-- (drop the serial default first, then re-point the default at gen_random_uuid()).
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
DROP SEQUENCE IF EXISTS "users_id_seq";
