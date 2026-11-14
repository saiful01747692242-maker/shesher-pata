import HomeClient from './HomeClient';
import { SeoBookLinks } from '../src/components/SeoBookLinks';

export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <HomeClient />
      <SeoBookLinks />
    </>
  );
}
