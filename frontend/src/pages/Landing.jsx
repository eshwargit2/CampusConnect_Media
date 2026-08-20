import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  MessageSquare,
  Compass,
  ShieldCheck,
  Sparkles,
  Heart,
  Code,
  Coffee,
  ArrowRight,
  Send,
  UserCheck,
  Zap,
  Github,
  Laptop
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const Landing = () => {
  const isMobile = useIsMobile();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeStat, setActiveStat] = useState(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Features list
  const features = [
    {
      id: 'feed',
      icon: <Compass size={28} className="text-[#3b82f6]" />,
      title: 'Interactive Feed',
      description: 'Share campus highlights, post photo updates, like, and comment on peers\' activities with optimistic animations.',
      color: 'var(--yellow)',
      stat: '10K+ Daily Interactions'
    },
    {
      id: 'chat',
      icon: <MessageSquare size={28} className="text-[#10b981]" />,
      title: 'Real-Time Chat',
      description: 'Connect instantly with classmates. Send media attachments, see online status, and chat with zero lag.',
      color: 'var(--green)',
      stat: 'Real-Time WebSockets'
    },
    {
      id: 'stories',
      icon: <Sparkles size={28} className="text-[#f59e0b]" />,
      title: '24h Stories',
      description: 'Post updates and stories that disappear after 24 hours. Keep your college circle updated on local campus events.',
      color: '#f59e0b',
      stat: 'Ephemeral Snapshots'
    },
    {
      id: 'security',
      icon: <ShieldCheck size={28} className="text-[#ef4444]" />,
      title: 'College-Only Auth',
      description: 'Secure student verification. Registration is restricted to verified campus emails, ensuring a safe community.',
      color: 'var(--red)',
      stat: '100% Student-Only'
    }
  ];

  // Developer fun stats
  const devStats = [
    { label: 'Lines of Code', value: '15,000+', icon: <Code size={16} /> },
    { label: 'Coffee Fuel', value: '120+ Cups', icon: <Coffee size={16} /> },
    { label: 'Bug Squashes', value: '99.9%', icon: <Zap size={16} /> },
    { label: 'Active Servers', value: 'Supabase DB', icon: <Laptop size={16} /> }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-body)',
      color: 'var(--text-body)',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden'
    }}>

      {/* ── STICKY GLASSMORPHIC HEADER ── */}
      <header className="landing-navbar" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: isMobile ? '60px' : '72px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: 'var(--border-thick)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 30px rgba(166, 180, 200, 0.05)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1100px',
          padding: isMobile ? '0 16px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', textDecoration: 'none' }}>
            <div style={{
              width: isMobile ? '32px' : '40px',
              height: isMobile ? '32px' : '40px',
              background: 'var(--yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isMobile ? '10px' : '12px',
              boxShadow: 'var(--clay-btn-shadow)'
            }}>
              <GraduationCap size={isMobile ? 18 : 22} color="#ffffff" />
            </div>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: '800',
              fontSize: isMobile ? '14px' : '20px',
              letterSpacing: '0.5px',
              color: 'var(--black)',
              textTransform: 'uppercase'
            }}>
              College<span style={{ color: 'var(--yellow)' }}>Circle</span>
            </span>
          </Link>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
            <Link to="/login" className="btn-ghost" style={{
              padding: isMobile ? '8px 12px' : '10px 18px',
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: '700',
              borderRadius: isMobile ? '10px' : '14px'
            }}>
              SIGN IN
            </Link>
            <Link to="/register" className="btn-brand" style={{
              padding: isMobile ? '8px 12px' : '10px 18px',
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: '700',
              borderRadius: isMobile ? '10px' : '14px',
              boxShadow: 'var(--clay-btn-shadow)'
            }}>
              {isMobile ? 'REGISTER' : 'GET STARTED'}
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN HERO SECTION ── */}
      <section style={{
        paddingTop: isMobile ? '120px' : '160px',
        paddingBottom: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr',
          gap: '48px',
          alignItems: 'center'
        }}>
          {/* Left Column: Tagline & Intro */}
          <div className="animate-fade-in-up">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--primary-tint)',
              color: 'var(--yellow)',
              padding: '6px 14px',
              borderRadius: '99px',
              fontSize: '11px',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '20px',
              border: '1px solid rgba(59, 130, 246, 0.15)'
            }}>
              <Sparkles size={12} /> Exclusively for Students
            </div>

            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? '38px' : '54px',
              fontWeight: '900',
              lineHeight: 1.15,
              color: 'var(--black)',
              letterSpacing: '-1.5px',
              marginBottom: '20px'
            }}>
              Your Campus. <br />
              <span className="gradient-text">Your Circle.</span>
            </h1>

            <p style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              marginBottom: '32px',
              maxWidth: '520px'
            }}>
              A private, interactive community where classmates connect. Post stories,
              browse the social feed, comment, like posts, and message in real-time.
              Always verified, secure, and student-only.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Link to="/register" className="btn-brand" style={{
                padding: '16px 28px',
                fontSize: '13px',
                borderRadius: '16px',
                gap: '10px'
              }}>
                CREATE ACCOUNT <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-ghost" style={{
                padding: '16px 28px',
                fontSize: '13px',
                borderRadius: '16px'
              }}>
                SIGN IN NOW
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Background Blob decoration */}
            <div style={{
              position: 'absolute',
              width: '280px',
              height: '280px',
              background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%)',
              filter: 'blur(30px)',
              zIndex: -1,
              top: '10%',
              left: '10%'
            }} />

            {/* Claymorphic Post Mockup */}
            <div style={{
              background: 'var(--white)',
              border: 'var(--border-thick)',
              borderRadius: '28px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: 'var(--shadow-lg)',
              transform: 'rotate(2deg)',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03) rotate(0deg)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(2deg)'}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div className="avatar-text" style={{ width: '38px', height: '38px', fontSize: '14px' }}>
                  JD
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--black)', fontFamily: "'Outfit', sans-serif" }}>Eshwar</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>@college.edu • 2h ago</div>
                </div>
              </div>

              {/* Photo Area */}
              <div style={{
                height: '180px',
                background: 'linear-gradient(135deg, var(--primary-tint) 0%, rgba(96,165,250,0.2) 100%)',
                borderRadius: '18px',
                border: 'var(--border)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--yellow)',
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: "'Outfit', sans-serif"
              }}>
                📸 Campus Vibes Today!
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <button style={{
                  background: 'var(--danger-tint)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '800',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  <Heart size={14} fill="var(--red)" /> 24 Likes
                </button>

                <div style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '700',
                  fontSize: '11px',
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  <MessageSquare size={14} /> 5 Comments
                </div>
              </div>

              {/* Caption */}
              <p style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--text-body)' }}>
                <strong>Eshwar</strong> Enjoying the library lobby in this peaceful weather. Can't wait for exams to finish! 🎓✨
              </p>
            </div>

            {/* Floating Messaging Mockup Badge */}
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              left: isMobile ? '10px' : '-30px',
              background: 'var(--white)',
              border: 'var(--border-thick)',
              borderRadius: '20px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow)',
              transform: 'rotate(-4deg)',
              maxWidth: '240px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                background: 'var(--green)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--green)'
              }} />
              <div style={{ fontSize: '11px', fontWeight: '700', fontFamily: "'Outfit', sans-serif", color: 'var(--black)' }}>
                Sarah: "Wanna meet at hall B?"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PURPOSE & CORE FEATURES GRID ── */}
      <section ref={sectionRef} style={{
        padding: '80px 24px',
        background: 'var(--white-05, rgba(255, 255, 255, 0.03))',
        borderTop: 'var(--border-thick)',
        borderBottom: 'var(--border-thick)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '1100px' }}>

          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px',
              fontWeight: '900',
              color: 'var(--black)',
              marginBottom: '16px'
            }}>
              Built For Campus Life
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              CollegeCircle is tailored for university students, packing modern features into a clean, intuitive clay-design layout.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '24px'
          }}>
            {features.map((feat) => {
              const isHovered = hoveredCard === feat.id;
              return (
                <div
                  key={feat.id}
                  className={`clay-card-entrance ${sectionVisible ? 'visible' : ''}`}
                  style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    padding: '28px',
                    boxShadow: isHovered ? 'var(--shadow-lg)' : 'var(--shadow)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={() => setHoveredCard(feat.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'var(--primary-tint)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      boxShadow: isHovered ? 'var(--clay-btn-shadow)' : 'none',
                      transition: 'all 0.25s ease'
                    }}>
                      {feat.icon}
                    </div>

                    <h3 style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '18px',
                      fontWeight: '800',
                      color: 'var(--black)',
                      marginBottom: '12px'
                    }}>
                      {feat.title}
                    </h3>

                    <p style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--text-muted)',
                      marginBottom: '24px'
                    }}>
                      {feat.description}
                    </p>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    fontSize: '11px',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: '800',
                    color: feat.color,
                    background: 'var(--primary-tint)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {feat.stat}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DEVELOPER / CREATOR SECTION ── */}
      <section style={{
        padding: '80px 24px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '1100px' }}>

          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px',
              fontWeight: '900',
              color: 'var(--black)',
              marginBottom: '16px'
            }}>
              Behind The Platform
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Designed and coded from the ground up by student developers.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '24px',
            alignItems: 'stretch'
          }}>
            {/* ── CARD 1: ESHWAR (RPG Stats Style) ── */}
            <div style={{
              background: 'var(--white)',
              border: 'var(--border-thick)',
              borderRadius: '28px',
              padding: '24px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.25s ease'
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--yellow) 0%, #a5b4fc 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#ffffff',
                    boxShadow: 'var(--clay-btn-shadow)',
                    border: '2px solid var(--white)'
                  }}>
                    E
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: '800', color: 'var(--black)' }}>
                      Soundhareshwaran S R
                    </h3>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Lead Architect
                    </p>
                  </div>
                </div>




              </div>

              <div>
                <a href="https://github.com/eshwargit2" target="_blank" rel="noreferrer" className="btn-ghost" style={{
                  padding: '8px 12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  width: '100%',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Github size={12} /> GITHUB PROFILE
                </a>
              </div>
            </div>

            {/* ── CARD 2: SIBIRAJ S (Realtime Status & Badges Style) ── */}
            <div style={{
              background: 'var(--white)',
              border: 'var(--border-thick)',
              borderRadius: '28px',
              padding: '24px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.25s ease'
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #a7f3d0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#ffffff',
                    boxShadow: 'var(--clay-btn-shadow)',
                    border: '2px solid var(--white)'
                  }}>
                    S
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: '800', color: 'var(--black)' }}>
                      Sibiraj S
                    </h3>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Full Stack Developer
                    </p>
                  </div>
                </div>


              </div>

              <div>
                <a href="https://github.com/vipsibi" target="_blank" rel="noreferrer" className="btn-ghost" style={{
                  padding: '8px 12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  width: '100%',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Github size={12} /> GITHUB PROFILE
                </a>
              </div>
            </div>

            {/* ── CARD 3: SHARVESH S (Progress Bars UI Style) ── */}
            <div style={{
              background: 'var(--white)',
              border: 'var(--border-thick)',
              borderRadius: '28px',
              padding: '24px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.25s ease'
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#ffffff',
                    boxShadow: 'var(--clay-btn-shadow)',
                    border: '2px solid var(--white)'
                  }}>
                    SS
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: '800', color: 'var(--black)' }}>
                      Sharvesh S
                    </h3>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Full Stack Developer
                    </p>
                  </div>
                </div>


              </div>

              <div>
                <a href="https://github.com/Sharvesh3ker" target="_blank" rel="noreferrer" className="btn-ghost" style={{
                  padding: '8px 12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  width: '100%',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Github size={12} /> GITHUB PROFILE
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA FOOTER BANNER ── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, var(--yellow) 0%, #2563eb 100%)',
        color: '#ffffff',
        textAlign: 'center',
        borderTop: 'var(--border-thick)',
        borderBottom: 'var(--border-thick)'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '32px',
            fontWeight: '900',
            marginBottom: '16px',
            letterSpacing: '-1px'
          }}>
            Ready to Connect?
          </h2>
          <p style={{
            fontSize: '15px',
            opacity: 0.9,
            marginBottom: '32px',
            lineHeight: 1.5
          }}>
            Join your classmates inside. Make posts, likes, replies, and exchange ideas in real time. Registration takes less than a minute.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: '#ffffff',
              color: 'var(--blue)',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: '700',
              fontSize: '13px',
              padding: '14px 28px',
              borderRadius: '16px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              CREATE FREE ACCOUNT <ArrowRight size={14} />
            </Link>
            <Link to="/login" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: '700',
              fontSize: '13px',
              padding: '14px 28px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              LOGIN
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: 'var(--white)',
        borderTop: 'var(--border-thick)'
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: '700',
          color: 'var(--text-muted)',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          © {new Date().getFullYear()} COLLEGE CIRCLE. ALL RIGHTS RESERVED.
        </p>

      </footer>

    </div>
  );
};

export default Landing;
