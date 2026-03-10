// components/profile/AcademicInfoCard.tsx
import React from 'react';
import InfoRow from './InfoRow';
import ProfileInfoCard from './ProfileInfoCard';
import { safeText } from './profileUtils';

type Props = {
  levelName:  string | null;
  classTitle: string | null;
};

export default function AcademicInfoCard({ levelName, classTitle }: Props) {
  return (
    <ProfileInfoCard title="Πληροφορίες Τάξης">
      <InfoRow icon="level" label="Επίπεδο" value={safeText(levelName)}  />
      <InfoRow icon="class" label="Τμήμα"   value={safeText(classTitle)} last />
    </ProfileInfoCard>
  );
}