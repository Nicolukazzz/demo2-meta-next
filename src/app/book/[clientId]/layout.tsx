import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Reservar Cita",
    description: "Agenda tu cita fácilmente",
};

export default function BookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
