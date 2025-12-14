-- Create the books table
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT
);

-- Insert initial data
INSERT INTO books (id, title, author, description) VALUES
    ('gatsby', 'The Great Gatsby', 'F. Scott Fitzgerald', 'A novel about the American dream and the roaring twenties.'),
    ('1984', '1984', 'George Orwell', 'A dystopian social science fiction novel and cautionary tale.'),
    ('pride', 'Pride and Prejudice', 'Jane Austen', 'A romantic novel of manners.'),
    ('moby', 'Moby Dick', 'Herman Melville', 'The narrative of the sailor Ishmael and the obsessive quest of Ahab.'),
    ('holmes', 'Sherlock Holmes', 'Arthur Conan Doyle', 'Adventures of the famous detective.');
