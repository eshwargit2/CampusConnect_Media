import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const TopNavbar = () => {
    return (
        <div className="top-navbar">
            <div style={{
                width: '100%',
                maxWidth: '680px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                boxSizing: 'border-box'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                    <GraduationCap size={24} color="var(--yellow)" />
                    <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '800',
                        fontSize: '18px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: 'var(--black)',
                    }}>
                        COLLEGE<span style={{ color: 'var(--yellow)' }}>CIRCLE</span>
                    </span>
                </Link>
            </div>
        </div>
    );
};

export default TopNavbar;
