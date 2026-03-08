
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from 'framer-motion';

export default function OrphaNovaCanvas({ theme }) {
  const containerRef = useRef(null);
  const centerRef = useRef(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [isMobile, setIsMobile] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const leftItems = useMemo(
    () => [
      "Literature Scoping",
      "Hypothesis Generation",
      "Trial Planning",
      "Experimental Design",
      "Clinical Trial Design",
      "Grant Writing",
      "Rare Disease Hub",
      "Research Collaboration",
      "Disease-Specific Agents",
    ],
    []
  );

  const rightItems = useMemo(
    () => [
      "PubMed",
      "UniProt",
      "Orphanet",
      "NCBI",
      "Semantic Scholar",
      "FDA Orange Book",
      "ClinicalTrials.gov",
      "DrugBank",
      "ChEMBL",
      "WHO ICTRP",
    ],
    []
  );

  const leftRefs = useRef(leftItems.map(() => React.createRef()));
  const rightRefs = useRef(rightItems.map(() => React.createRef()));

  const [lines, setLines] = useState({ right: [], left: [] });

  useEffect(() => {
    if (isMobile) {
      setLines({ right: [], left: [] });
      return;
    }

    const resize = () => {
      const container = containerRef.current?.getBoundingClientRect();
      const center = centerRef.current?.getBoundingClientRect();
      if (!container || !center) return;

      const centerPoint = {
        x: center.left - container.left + center.width / 2,
        y: center.top - container.top + center.height / 2
      };

      const mkCurve = (from, to) => {
        const dx = (to.x - from.x) * 0.4;
        const c1 = { x: from.x + dx, y: from.y };
        const c2 = { x: to.x - dx, y: to.y };
        return `M ${from.x},${from.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
      };

      const leftLines = leftRefs.current.map((r) => {
        const b = r.current?.getBoundingClientRect();
        if (!b) return null;
        const p1 = {
          x: b.right - container.left + 8,
          y: b.top - container.top + b.height / 2
        };
        const p2 = { x: centerPoint.x - 64, y: centerPoint.y };
        return mkCurve(p1, p2);
      }).filter(Boolean);

      const rightLines = rightRefs.current.map((r) => {
        const b = r.current?.getBoundingClientRect();
        if (!b) return null;
        const p1 = { x: centerPoint.x + 64, y: centerPoint.y };
        const p2 = {
          x: b.left - container.left - 8,
          y: b.top - container.top + b.height / 2
        };
        return mkCurve(p1, p2);
      }).filter(Boolean);

      setLines({ right: leftLines, left: rightLines });
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("scroll", resize, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const centerVariants = {
    hidden: {
      scale: 0,
      rotate: -180,
      opacity: 0
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 15,
        delay: 1
      }
    }
  };

  return (
    <motion.section
      ref={sectionRef}
      className="py-12 sm:py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <motion.div
          className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-gradient-to-r from-blue-400/15 to-cyan-400/15' : 'bg-gradient-to-r from-blue-300/10 to-cyan-300/10'
          }`}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className={`absolute bottom-20 right-20 w-80 h-80 rounded-full blur-3xl ${
            isDark ? 'bg-gradient-to-r from-purple-400/15 to-pink-400/15' : 'bg-gradient-to-r from-purple-300/10 to-pink-300/10'
          }`}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 270, 180, 90, 0],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full ${
            isDark ? 'bg-gradient-radial from-indigo-400/10 to-transparent' : 'bg-gradient-radial from-indigo-300/8 to-transparent'
          }`}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 px-2"
            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            One Unified Research Ecosystem
          </motion.h2>
          <motion.p
            className="text-base sm:text-xl max-w-3xl mx-auto leading-relaxed px-2"
            style={{ color: isDark ? '#dbeafe' : '#64748b' }}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Replace dozens of disconnected tools with one intelligent AI-powered research workspace that connects everything seamlessly.
          </motion.p>
        </motion.div>
      </div>

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <style>{`
            .pill-${theme} {
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              backdrop-filter: blur(10px);
              border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(226, 232, 240, 0.8)'};
              background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)'};
              color: ${isDark ? '#ffffff' : '#0f172a'};
            }
            .centerHub-${theme} {
              position: relative;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              backdrop-filter: blur(20px);
              border: 2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.3)'};
            }
          `}</style>

          <motion.div
            className="space-y-8"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.3
                }
              }
            }}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {/* Features Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: isDark ? '#bfdbfe' : '#1e40af' }}>
                Research Tools
              </h3>
              {leftItems.map((t, i) => (
                <motion.div
                  key={t}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className={`pill-${theme} rounded-2xl backdrop-blur-md px-4 py-3 flex items-center justify-center text-sm font-semibold shadow-lg`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 mr-2" />
                  {t}
                </motion.div>
              ))}
            </div>

            {/* Center Hub */}
            <motion.div
              variants={{
                hidden: { scale: 0, rotate: -180, opacity: 0 },
                visible: { scale: 1, rotate: 0, opacity: 1 }
              }}
              className="flex justify-center my-8"
            >
              <div className={`centerHub-${theme} bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white text-xl font-bold w-40 h-40 rounded-full flex items-center justify-center shadow-2xl`}>
                <span>OrphaNova</span>
              </div>
            </motion.div>

            {/* Data Sources Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: isDark ? '#e9d5ff' : '#7c3aed' }}>
                Data Sources
              </h3>
              {rightItems.map((t, i) => (
                <motion.div
                  key={t}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className={`pill-${theme} rounded-2xl backdrop-blur-md px-4 py-3 flex items-center justify-center text-sm font-semibold shadow-lg`}
                >
                  {t}
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 ml-2" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        /* Desktop Layout */
        <div ref={containerRef} className="relative z-10 max-w-6xl mx-auto h-full min-h-[640px]" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          <style>{`
            .pill-${theme} {
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              max-width: 240px;
              backdrop-filter: blur(10px);
              border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(226, 232, 240, 0.8)'};
              background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)'};
              color: ${isDark ? '#ffffff' : '#0f172a'};
            }
            .pill-${theme}:hover {
              transform: translateY(-4px) scale(1.05);
              box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }
            .centerHub-${theme} {
              position: relative;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              backdrop-filter: blur(20px);
              border: 2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.3)'};
            }
            .centerHub-${theme}:hover {
              transform: scale(1.08);
              box-shadow: 0 20px 60px rgba(59, 130, 246, 0.4);
            }
            .centerHub-${theme}::after {
              content: "";
              position: absolute;
              inset: -12px;
              border-radius: 9999px;
              border: 3px solid rgba(59, 130, 246, 0.15);
              animation: pulse 3s ease-out infinite;
            }
            .centerHub-${theme}::before {
              content: "";
              position: absolute;
              inset: -8px;
              border-radius: 9999px;
              border: 2px solid rgba(59, 130, 246, 0.25);
              animation: pulse 2s ease-out infinite reverse;
            }
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.8; }
              50% { transform: scale(1.05); opacity: 0.4; }
              100% { transform: scale(1.15); opacity: 0; }
            }
            .flow {
              stroke: ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.6)'};
              stroke-width: 3;
              fill: none;
              filter: drop-shadow(0 0 4px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)'});
              stroke-dasharray: 8 12;
            }
            .flowAnimated {
              animation: dash 4s linear infinite;
            }
            @keyframes dash {
              to { stroke-dashoffset: 160; }
            }
          `}</style>

          <motion.div
            className="h-full grid grid-cols-12 gap-4 py-10"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <div className="col-span-12 md:col-span-4 flex flex-col gap-4 justify-center items-end">
              {leftItems.map((t, i) => (
                <motion.div
                  key={t}
                  ref={leftRefs.current[i]}
                  variants={itemVariants}
                  whileHover={{
                    scale: 1.05,
                    y: -4,
                    transition: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  className={`pill-${theme} rounded-2xl backdrop-blur-md px-4 py-3 flex items-center justify-start text-sm font-semibold shadow-lg`}
                >
                  <motion.span
                    className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 mr-3 shadow-sm"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                  {t}
                </motion.div>
              ))}
            </div>

            <div className="col-span-12 md:col-span-4 flex items-center justify-center relative">
              <motion.div
                ref={centerRef}
                variants={centerVariants}
                whileHover={{
                  scale: 1.08,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className={`centerHub-${theme} bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white text-2xl font-bold w-52 h-52 rounded-full flex items-center justify-center shadow-2xl`}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                />
                <span className="relative z-10">OrphaNova</span>
              </motion.div>
            </div>

            <div className="col-span-12 md:col-span-4 flex flex-col gap-4 justify-center items-start">
              {rightItems.map((t, i) => (
                <motion.div
                  key={t}
                  ref={rightRefs.current[i]}
                  variants={itemVariants}
                  whileHover={{
                    scale: 1.05,
                    y: -4,
                    transition: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  className={`pill-${theme} rounded-2xl backdrop-blur-md px-4 py-3 flex items-center justify-end text-sm font-semibold shadow-lg`}
                >
                  {t}
                  <motion.span
                    className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 ml-3 shadow-sm"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <svg className="pointer-events-none absolute inset-0 w-full h-full">
            {lines.left.map((d, idx) => (
              <path
                key={`l-${idx}`}
                d={d}
                className="flow flowAnimated"
              />
            ))}
            {lines.right.map((d, idx) => (
              <path
                key={`r-${idx}`}
                d={d}
                className="flow flowAnimated"
              />
            ))}
          </svg>
        </div>
      )}
    </motion.section>
  );
}
