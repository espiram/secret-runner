-- A Mí Me Tocó... v1.2: messages, sent and received confirmations.
-- Run ONCE after 006_unique_participant_names.sql.
-- No existing participants, assignments or wishes are changed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gift_fulfillment (
  exchange_id uuid NOT NULL,
  giver_id uuid NOT NULL,
  message text CHECK (message IS NULL OR char_length(btrim(message)) BETWEEN 30 AND 1000),
  message_updated_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  PRIMARY KEY (exchange_id, giver_id),
  FOREIGN KEY (exchange_id, giver_id) REFERENCES public.assignments(exchange_id, giver) ON DELETE CASCADE
);
ALTER TABLE public.gift_fulfillment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_fulfillment FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS gift_fulfillment_exchange_idx ON public.gift_fulfillment(exchange_id);

-- Serialize concurrent updates using the existing assignment row.
-- Access to these RPCs is limited to service_role, and the Edge Function
-- verifies the session token before passing the caller's participant ID.
CREATE OR REPLACE FUNCTION public.gift_save_message(p_exchange uuid, p_giver uuid, p_message text)
RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE state public.gift_fulfillment%ROWTYPE;
BEGIN
  IF p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 30 AND 1000 THEN
    RAISE EXCEPTION 'El mensaje debe tener entre 30 y 1000 caracteres';
  END IF;
  PERFORM 1 FROM public.assignments WHERE exchange_id=p_exchange AND giver=p_giver FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay una asignación válida'; END IF;
  SELECT * INTO state FROM public.gift_fulfillment WHERE exchange_id=p_exchange AND giver_id=p_giver;
  IF state.received_at IS NOT NULL AND state.message IS NOT NULL THEN
    RAISE EXCEPTION 'El mensaje ya fue revelado y no puede modificarse';
  END IF;
  INSERT INTO public.gift_fulfillment(exchange_id,giver_id,message,message_updated_at)
  VALUES(p_exchange,p_giver,btrim(p_message),now())
  ON CONFLICT(exchange_id,giver_id) DO UPDATE
    SET message=EXCLUDED.message,message_updated_at=EXCLUDED.message_updated_at;
END $$;

CREATE OR REPLACE FUNCTION public.gift_mark_sent(p_exchange uuid, p_giver uuid)
RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.assignments WHERE exchange_id=p_exchange AND giver=p_giver FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay una asignación válida'; END IF;
  INSERT INTO public.gift_fulfillment(exchange_id,giver_id,sent_at)
  VALUES(p_exchange,p_giver,now())
  ON CONFLICT(exchange_id,giver_id) DO UPDATE
    SET sent_at=coalesce(public.gift_fulfillment.sent_at,EXCLUDED.sent_at);
END $$;

CREATE OR REPLACE FUNCTION public.gift_confirm_received(p_exchange uuid, p_receiver uuid)
RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE target_giver uuid;
BEGIN
  SELECT giver INTO target_giver FROM public.assignments
    WHERE exchange_id=p_exchange AND receiver=p_receiver FOR UPDATE;
  IF target_giver IS NULL THEN RAISE EXCEPTION 'No hay un regalo asignado a este participante'; END IF;
  INSERT INTO public.gift_fulfillment(exchange_id,giver_id,received_at)
  VALUES(p_exchange,target_giver,now())
  ON CONFLICT(exchange_id,giver_id) DO UPDATE
    SET received_at=coalesce(public.gift_fulfillment.received_at,EXCLUDED.received_at);
END $$;

REVOKE ALL ON FUNCTION public.gift_save_message(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gift_mark_sent(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gift_confirm_received(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gift_save_message(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gift_mark_sent(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.gift_confirm_received(uuid,uuid) TO service_role;
COMMIT;
