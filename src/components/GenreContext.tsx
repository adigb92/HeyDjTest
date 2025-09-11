import { createContext } from "react";

type GenreContextType = {
    genre: string;
    setGenre: (value: string) => void;
};

const GenreContext = createContext<GenreContextType>({ genre: "", setGenre: () => { } });

export default GenreContext;
