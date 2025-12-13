'use client';

type Book = {
    id: string;
    title: string;
};

const BOOKS: Book[] = [
    { id: 'gatsby', title: 'The Great Gatsby' },
    { id: '1984', title: '1984' },
    { id: 'pride', title: 'Pride and Prejudice' },
    { id: 'moby', title: 'Moby Dick' },
    { id: 'holmes', title: 'Sherlock Holmes' },
];

export function BookSelector({
    selectedBookId,
    onSelect,
}: {
    selectedBookId: string | null;
    onSelect: (bookId: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4 text-center sm:text-left">
            <h2 className="text-xl font-semibold">Choose a Book</h2>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {BOOKS.map((book) => (
                    <button
                        key={book.id}
                        onClick={() => onSelect(book.id)}
                        className={`px-4 py-2 rounded-full border transition-colors ${selectedBookId === book.id
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]'
                            }`}
                    >
                        {book.title}
                    </button>
                ))}
            </div>
        </div>
    );
}
