import React from 'react';
import './DottedGlobe.css';

const DottedGlobe: React.FC = () => {
    return (
        <div className="hero-globe-wrapper">
            <img
                src="/assets/aleo_globe.png"
                alt="Aleo Globe"
                className="hero-globe-img"
                style={{
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                }}
            />

            <div className="hero-ellipse hero-ellipse--dashed" />
            <div className="hero-ellipse hero-ellipse--solid" />

           
        </div>
    );
};

export default DottedGlobe;
