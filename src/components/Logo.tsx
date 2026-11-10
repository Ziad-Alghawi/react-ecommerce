import { STORE_NAME } from './PageTitle';
import GreenLogo from '../assets/images/logo.webp';
import GreenMobileLogo from '../assets/images/mobile-logo.png';
import WhiteLogo from '../assets/images/logo-white.webp';
import WhiteMobileLogo from '../assets/images/mobile-logo-white.png';

interface LogoProps {
  // The white logo, for the dark green header
  white?: boolean;
}

// Phones only download the small logo
export function Logo({ white = false }: LogoProps) {
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={white ? WhiteMobileLogo : GreenMobileLogo}
        width="26" height="30" data-testid="mobile-logo" />
      <img className="logo" src={white ? WhiteLogo : GreenLogo} alt={`${STORE_NAME} home`}
        width="150" height="44" data-testid="logo" />
    </picture>
  );
}
