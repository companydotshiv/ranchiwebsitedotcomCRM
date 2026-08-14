import { redirect } from 'next/navigation';

export default function HRIndex() {
  redirect('/dashboard/hr/attendance');
}
