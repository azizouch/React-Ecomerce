-- Create ticket categories table
CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category_id UUID REFERENCES ticket_categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'customer')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_admin_id ON tickets(assigned_admin_id);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_due_at ON tickets(due_at);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_sender_id ON ticket_messages(sender_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

-- Enable RLS
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_categories
CREATE POLICY "Anyone can view ticket categories"
  ON ticket_categories FOR SELECT
  USING (true);

-- RLS Policies for tickets
CREATE POLICY "Customers can view their own tickets"
  ON tickets FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins and gestionnaires can view all tickets"
  ON tickets FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

CREATE POLICY "Customers can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins and gestionnaires can update tickets"
  ON tickets FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

-- RLS Policies for ticket_messages
CREATE POLICY "Customers can view messages in their tickets"
  ON ticket_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid()));

CREATE POLICY "Admins and gestionnaires can view all ticket messages"
  ON ticket_messages FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

CREATE POLICY "Users can create messages in assigned tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND 
    (
      ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid()) OR
      ticket_id IN (SELECT id FROM tickets WHERE assigned_admin_id = auth.uid() OR (assigned_admin_id IS NULL AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire'))))
    )
  );

-- Insert default ticket categories
INSERT INTO ticket_categories (name, description) VALUES
  ('Refund', 'Request for refund or money back'),
  ('Shipping', 'Issues related to order delivery'),
  ('Wrong Item', 'Received wrong or damaged item'),
  ('Payment Issue', 'Payment problems or charges'),
  ('Product Question', 'General questions about products'),
  ('Account Issue', 'Account-related problems'),
  ('Other', 'Other issues or inquiries')
ON CONFLICT (name) DO NOTHING;
