-- ============================================================
-- Finance Tracker Schema
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          decimal(10, 2) NOT NULL,
  type            varchar NOT NULL CHECK (type IN ('income', 'expense')),
  category        varchar NOT NULL,
  subcategory     varchar,
  description     text,
  date            date NOT NULL,
  mood            varchar CHECK (mood IN ('happy', 'stressed', 'bored', 'celebratory')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           varchar(100) NOT NULL,
  target_amount   decimal(10, 2) NOT NULL,
  current_amount  decimal(10, 2) NOT NULL DEFAULT 0,
  deadline        date NOT NULL,
  category        varchar,
  is_achieved     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE predictions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_date        date NOT NULL,
  predicted_month_total  decimal(10, 2) NOT NULL,
  goal_at_risk           boolean NOT NULL,
  confidence_level       varchar NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
  suggestion             text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_transactions_user_id  ON transactions (user_id);
CREATE INDEX idx_transactions_date     ON transactions (date);
CREATE INDEX idx_transactions_user_date ON transactions (user_id, date);

CREATE INDEX idx_goals_user_id         ON goals (user_id);
CREATE INDEX idx_goals_deadline        ON goals (deadline);

CREATE INDEX idx_predictions_user_id   ON predictions (user_id);
CREATE INDEX idx_predictions_date      ON predictions (prediction_date);
-- Supports the "one prediction per user per day" cache lookup
CREATE UNIQUE INDEX idx_predictions_user_date ON predictions (user_id, prediction_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions  ENABLE ROW LEVEL SECURITY;

-- transactions
CREATE POLICY "transactions: users manage own rows"
  ON transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- goals
CREATE POLICY "goals: users manage own rows"
  ON goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- predictions
CREATE POLICY "predictions: users manage own rows"
  ON predictions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
