import { useEffect, useState } from "react";
import FlapUnit from "./FlapUnit";
import styles from "./SplitFlapBoard.module.css";

const SplitFlapBoard = ({
  values = [],
  interval = 2800,
  width = 8,
  loop = true,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (values.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= values.length) {
          if (loop) return 0;
          clearInterval(id);
          return i;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [values, interval, loop]);

  const current = (values[index] || "")
    .padEnd(width, " ")
    .slice(0, width)
    .toUpperCase();

  return (
    <div className={styles.board}>
      {current.split("").map((char, i) => (
        <FlapUnit key={i} char={char} />
      ))}
    </div>
  );
};

export default SplitFlapBoard;
