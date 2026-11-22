-- Five authoritative demo rows from the old Supabase seed. No reporter accounts.

insert into items (title, description, category, status, location, lost_found_date, reporter_email, reporter_phone)
values
  ('Campus ID card', 'Blue student ID, found near the cafeteria.', 'ID & Documents', 'found', 'Cafeteria, Building A', '2026-11-10', 'finder@student.edu', '555-0101'),
  ('Wireless earbuds', 'Black earbuds in charging case, left in library study room 3.', 'Electronics', 'lost', 'Library, Room 3', '2026-11-09', 'owner@student.edu', '555-0102'),
  ('Engineering textbook', 'Thermodynamics hardcover, blue cover, name written inside.', 'Books', 'lost', 'Lecture Hall B2', '2026-11-08', 'owner@student.edu', '555-0103'),
  ('Black backpack', 'Nike backpack with laptop inside, found by the bus stop.', 'Bags', 'found', 'North bus stop', '2026-11-07', 'finder@student.edu', '555-0104'),
  ('House keys', 'Set of 3 keys on a red keyring, near the gym.', 'Keys', 'lost', 'Gym locker room', '2026-11-06', 'owner@student.edu', '555-0105');
