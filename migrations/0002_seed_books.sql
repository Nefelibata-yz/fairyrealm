-- Migration number: 0002 	 2025-12-21T00:00:00.000Z

-- Insert Charlotte's Web
INSERT INTO books (id, title, content, created_at) VALUES (
    'charlottes-web',
    'Charlotte''s Web',
    'Charlotte''s Web is a children''s novel by American author E. B. White.',
    1734790217000
);

-- Insert sample chunks for Chapter 1
INSERT INTO book_chunks (id, book_id, content, page_number) VALUES 
('cw-chunk-1', 'charlottes-web', 'Where''s Papa going with that axe?" said Fern to her mother as they were setting the table for breakfast. "Out to the hoghouse," replied Mrs. Arable. "Some pigs were born last night.', 1),
('cw-chunk-2', 'charlottes-web', '"I don''t see why he needs an axe," continued Fern, who was only eight. "Well," said her mother, "one of the pigs is a runt. It''s very small and weak, and it will never amount to anything. So your father has decided to do away with it.', 1),
('cw-chunk-3', 'charlottes-web', '"Do away with it?" shrieked Fern. "You mean kill it? Just because it''s smaller than the others?" Mrs. Arable put a pitcher of cream on the table. "Don''t yell, Fern!" she said. "Your father is right. The pig would probably die anyway.', 1);
