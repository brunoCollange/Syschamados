-- Limpa as mensagens dos chamados
DELETE FROM ticket_messages;

-- Limpa os anexos dos chamados
DELETE FROM ticket_attachments;

-- Limpa as notificações
DELETE FROM notifications;

-- Limpa os chamados
DELETE FROM tickets;

-- Reinicia a contagem dos IDs para começar do 1
DELETE FROM sqlite_sequence WHERE name IN ('tickets', 'ticket_messages', 'ticket_attachments', 'notifications');