// components/profile/ContactInfoCard.tsx
import React from 'react';
import InfoRow from './InfoRow';
import ProfileInfoCard from './ProfileInfoCard';
import { formatGreekDate, safeText } from './profileUtils';

type ParentsInfo = {
  father_name?: string | null;
  father_phone?: string | null;
  father_email?: string | null;
  father_date_of_birth?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
  mother_email?: string | null;
  mother_date_of_birth?: string | null;
};

type Props = {
  email:       string | null;
  phone:       string | null;
  dateOfBirth: string | null;
  parents?:    ParentsInfo | null;
};

export default function ContactInfoCard({ email, phone, dateOfBirth, parents }: Props) {
  return (
    <ProfileInfoCard
      title="Στοιχεία Επικοινωνίας"
      parents={parents}
      parentsButtonLabel="Γονείς"
    >
      <InfoRow icon="mail"     label="Email"           value={safeText(email)}              />
      <InfoRow icon="phone"    label="Τηλέφωνο"        value={safeText(phone)}              />
      <InfoRow icon="calendar" label="Ημ/νία Γέννησης" value={formatGreekDate(dateOfBirth)} last />
    </ProfileInfoCard>
  );
}