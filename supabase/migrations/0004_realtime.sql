-- Enables live updates for the order thread and the seller's order board.
-- Row-level visibility is still governed by the existing RLS policies on
-- these tables (orders_participant_read, order_messages_participant_read) —
-- adding a table to this publication only lets changes broadcast at all, it
-- does not bypass who's allowed to see them.
alter publication supabase_realtime add table order_messages;
alter publication supabase_realtime add table orders;
