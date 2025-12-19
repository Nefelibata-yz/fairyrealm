-- Insert a demo book
INSERT INTO books (id, title, content, created_at) VALUES 
('book-1', 'The Little Prince', 'Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal. Here is a copy of the drawing.', 1700000000);

-- Insert chunks for the book (Simple splitting by sentence for MVP)
INSERT INTO book_chunks (id, book_id, content, page_number) VALUES 
('chunk-1', 'book-1', 'Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest.', 1),
('chunk-2', 'book-1', 'It was a picture of a boa constrictor in the act of swallowing an animal.', 1),
('chunk-3', 'book-1', 'Here is a copy of the drawing.', 1);
