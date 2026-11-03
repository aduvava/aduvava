-- Persist extra time granted by a purchased helper so the server, browser,
-- and future requests agree on the same exam deadline.
ALTER TABLE "Attempt" ADD COLUMN "extraTimeSeconds" INTEGER NOT NULL DEFAULT 0;
