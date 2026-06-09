-- Migrasi awal KuliahPintar.id
-- Jalankan di Supabase SQL Editor atau via: supabase db push

-- ============================================================
-- TABEL PROFILES
-- Extend dari auth.users Supabase, auto-created via trigger
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tier        TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status             TEXT        NOT NULL DEFAULT 'inactive'
                                 CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  tier               TEXT        NOT NULL DEFAULT 'premium' CHECK (tier = 'premium'),
  start_date         TIMESTAMPTZ,
  end_date           TIMESTAMPTZ,
  midtrans_order_id  TEXT        UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL USAGE_LOGS
-- Untuk rate limiting free tier (5 request/hari)
-- ============================================================
CREATE TABLE usage_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature     TEXT        NOT NULL,
  tokens_used INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_logs_user_date ON usage_logs (user_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: user read/update own"    ON profiles     FOR ALL    USING (auth.uid() = id);
CREATE POLICY "subscriptions: user read own"      ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_logs: user read own"         ON usage_logs   FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile saat user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
