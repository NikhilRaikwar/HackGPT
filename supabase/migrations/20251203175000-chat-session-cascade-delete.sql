-- Cascade delete chat_messages when a chat_sessions row is deleted

-- Function to delete related chat_messages
create or replace function delete_related_chat_messages()
returns trigger as $$
begin
  delete from chat_messages
  where session_id = old.id;

  return old;
end;
$$ language plpgsql security definer;

-- Trigger on chat_sessions to call the function before delete
create or replace trigger on_chat_session_deleted
before delete on chat_sessions
for each row
execute function delete_related_chat_messages();
