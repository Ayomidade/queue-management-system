import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";

const TiltCard = ({ children }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-50, 50], [12, -12]), {
    stiffness: 150,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(x, [-50, 50], [-12, 12]), {
    stiffness: 150,
    damping: 15,
  });

  const handleMouseMove = (e) => {
    if (prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
    >
      {children}
    </motion.div>
  );
};

export default TiltCard;
