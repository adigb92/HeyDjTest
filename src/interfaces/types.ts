export interface AppUser {
    _id: string;
    name: string;
    email: string;
    phoneNumber: string;
    gender: string;
    isAdmin: boolean;
    genreChoice: string;
    genre?: string;
    time: Date;
    djId?: string;
    qrCodeDataURL?: string;
    profileCompleted?: boolean;
    youtubeLink?: string;
    authProvider?: 'google' | 'facebook' | null;
    isProfileComplete: boolean;
}

export type Event = {
    _id: string;
    djName: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
    djId: string;
    registeredUsers: Array<{
        userId: string;
        name: string;
        genreChoice: string;
        youtubeLink?: string;
    }>;
};
