import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Plane } from 'lucide-react';
import { FaInstagram, FaLinkedinIn, FaYoutube, FaGoogle } from 'react-icons/fa6';

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Corporate Office */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Plane className="h-8 w-8" />
              <span className="text-xl font-bold">
                Travel<span className="text-[hsl(var(--cyan-accent))]">Mate</span>
              </span>
            </Link>

            <p className="text-background/70 mb-4 max-w-md">
              Corporate Office
              <br />
              TravelMate Pvt LTD,
              <br />
              Novel Tech Park,
              <br />
              Opposite to 1 MG Mall,
              <br />
              MG Road, Bangalore - 560042
              <br />
              Karnataka, India.
            </p>
          </div>

          {/* Head Office */}
          <div>
            <h4 className="font-semibold mb-4">Head Office</h4>
            <p className="text-background/70 leading-7">
              TravelMate Pvt LTD,
              <br />
              No.1, Gemini Parsn,
              <br />
              Kodambakkam High Road,
              <br />
              Nungambakkam, Chennai - 600006
              <br />
              Tamil Nadu, India.
            </p>
          </div>

          {/* Branches */}
          <div>
            <h4 className="font-semibold mb-4">Our Branches</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-background/70">
              <span>Mumbai</span>
              <span>Trichy</span>
              <span>Hyderabad</span>
              <span>Salem</span>
              <span>Bangalore</span>
              <span>Kochi</span>
              <span>Chennai</span>
              <span>Vellore</span>
              <span>Coimbatore</span>
              <span>Pondicherry</span>
              <span>Erode</span>
              <span>Nagercoil</span>
              <span>Madurai</span>
              <span>Kanyakumari</span>
            </div>
          </div>

        </div>

        <div className="border-t border-background/20 mt-8 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-background/70">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>Call Us: +91 9342180670</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Email Us: mail@travelmate.in</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Follow Us:</span>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Instagram" className="hover:text-background transition-colors">
                <FaInstagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LinkedIn" className="hover:text-background transition-colors">
                <FaLinkedinIn className="h-4 w-4" />
              </a>
              <a href="#" aria-label="YouTube" className="hover:text-background transition-colors">
                <FaYoutube className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Google" className="hover:text-background transition-colors">
                <FaGoogle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-background/60">
          <p>&copy; {new Date().getFullYear()} TravelMate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
