-- Add more books
INSERT INTO books (id, title, content, created_at) VALUES 
('book-2', 'Harry Potter and the Sorcerer''s Stone', 'Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.', 1700000001),
('book-3', 'Charlotte''s Web', 'Where''s Papa going with that ax?" said Fern to her mother as they were setting the table for breakfast.', 1700000002);

-- Add chunks for new books
INSERT INTO book_chunks (id, book_id, content, page_number) VALUES 
('chunk-4', 'book-2', 'Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.', 1),
('chunk-5', 'book-3', 'Where''s Papa going with that ax?" said Fern to her mother as they were setting the table for breakfast.', 1);
