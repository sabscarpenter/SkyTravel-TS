CREATE SEQUENCE IF NOT EXISTS seq_passeggero START 100;

CREATE OR REPLACE FUNCTION set_id_passeggero()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := nextval('seq_passeggero');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_id_passeggero ON utenti;

CREATE TRIGGER trg_set_id_passeggero
BEFORE INSERT ON utenti
FOR EACH ROW
WHEN (NEW.id IS NULL)
EXECUTE FUNCTION set_id_passeggero();
