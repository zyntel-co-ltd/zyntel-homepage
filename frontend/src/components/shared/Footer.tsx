import React from 'react';

interface FooterProps {
  variant?: 'default' | 'dashboard';
}

const Footer: React.FC<FooterProps> = ({ variant = 'default' }) => (
  <footer className={variant === 'dashboard' ? 'footer-dashboard' : ''}>
    <div className="footer-zyntel">
      <img src="/images/zyntel_no_background.png" alt="Zyntel" />
    </div>
  </footer>
);

export default Footer;
