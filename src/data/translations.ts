import { ExamTranslation, AnnouncementTranslation } from '../types/exam';

const q = (title: string) => ({ title });

export const EXAM_EN: Record<string, ExamTranslation> = {
  'exam-01': {
    title: 'Graduation Exam Practice Test – Paper 101',
    subtitle: 'New 3-part Ministry format – Grade 12 Mathematics',
    subject: 'Mathematics',
    description: '12 multiple-choice, 4 true/false and 6 short-answer questions covering solid geometry, vectors, function analysis, integrals and probability.',
    questions: {
      'q-1': q(String.raw`Given the triangular prism $ABC.A'B'C'$. Which statement below is correct?`),
      'q-2': q(String.raw`In the coordinate space $Oxyz$, given $\overrightarrow{u} = 2\vec{i} - 3\vec{j} + 5\vec{k}$. The coordinates of $\overrightarrow{u}$ are:`),
      'q-3': q(String.raw`The function $y = f(x)$ has the variation table below. On which interval is $f$ decreasing?`),
      'q-4': q(String.raw`The graph of $y = f(x)$ is the curve shown below. On which interval is $f$ increasing?`),
      'q-5': q(String.raw`In $Oxyz$, the plane through $M(1; -2; 3)$ with normal vector $\vec{n} = (2; 1; -1)$ has equation:`),
      'q-6': q(String.raw`In $Oxyz$, the radius of the sphere $(S): (x - 2)^2 + (y + 1)^2 + (z - 4)^2 = 25$ is:`),
      'q-7': q(String.raw`The point of local minimum of $y = x^3 - 3x^2 + 2$ is:`),
      'q-8': q(String.raw`The value of the integral $I = \int_0^1 e^{2x} dx$ is:`),
      'q-9': q(String.raw`Given $\overrightarrow{a} = (1; 0; -1)$ and $\overrightarrow{b} = (0; 1; 1)$. The cosine of the angle between them is:`),
      'q-10': q(String.raw`For events $A$ and $B$ with $P(B) > 0$, the conditional probability of $A$ given $B$ is:`),
      'q-11': q(String.raw`The maximum value of $f(x) = x + \frac{4}{x}$ on $[1; 4]$ is:`),
      'q-12': q(String.raw`Pyramid $S.ABC$ has $SA \perp (ABC)$; the base $ABC$ is right isosceles at $B$, $AB = a$, $SA = a\sqrt{3}$. The distance from $A$ to plane $(SBC)$ is:`),
      'q-13': { title: String.raw`Regular tetrahedron $ABCD$ has edge $a$; $M, N$ are the midpoints of $AB$ and $CD$. Decide whether each statement is true or false:`, statements: { a: String.raw`The vector identity $\overrightarrow{AB} + \overrightarrow{BC} + \overrightarrow{CD} = \overrightarrow{AD}$ always holds.`,b: String.raw`Opposite edges are perpendicular, i.e. $\overrightarrow{AB} \cdot \overrightarrow{CD} = 0$.`,c: String.raw`The length $|\overrightarrow{AB} + \overrightarrow{AC}| = a\sqrt{2}$.`,d: String.raw`The volume of the regular tetrahedron $ABCD$ is $V = \frac{a^3\sqrt{2}}{12}$.` } },
      'q-14': { title: String.raw`Let $y = f(x) = \frac{x^2 - 3x + 3}{x - 1}$ with graph $(C)$. Decide whether each statement is true or false:`, statements: { a: String.raw`The domain is $D = \mathbb{R} \setminus \{1\}$.`,b: String.raw`The line $x = 1$ is a vertical asymptote and $y = x - 2$ is an oblique asymptote of $(C)$.`,c: String.raw`The derivative is $f'(x) = \frac{x^2 - 2x}{(x - 1)^2}$.`,d: String.raw`The function is increasing on its whole domain $D = \mathbb{R} \setminus \{1\}$.` } },
      'q-15': { title: String.raw`In $Oxyz$, given the plane $(P): 2x - y + 2z - 6 = 0$ and the point $A(1; 2; 3)$. Decide whether each statement is true or false:`, statements: { a: String.raw`The distance from $A$ to $(P)$ is $0$ (that is, $A$ lies on $(P)$).`,b: String.raw`The plane $(Q)$ through $A$ parallel to $(P)$ is $2x - y + 2z - 12 = 0$.`,c: String.raw`The vector $\vec{n} = (2; -1; 2)$ is a normal vector of $(P)$.`,d: String.raw`The sphere centered at $O(0; 0; 0)$ tangent to $(P)$ has radius $2$.` } },
      'q-16': { title: String.raw`Region $(H)$ is bounded by the parabola $y = x^2$ and the line $y = 2x$. Decide whether each statement is true or false:`, statements: { a: String.raw`The intersection equation has two distinct roots $x_1 = 0$ and $x_2 = 2$.`,b: String.raw`The area of $(H)$ is $S = \frac{4}{3}$.`,c: String.raw`On $[0; 2]$, $x^2 \ge 2x$.`,d: String.raw`Rotating $(H)$ about the $Ox$ axis gives volume $V = \frac{64\pi}{15}$.` } },
      'q-17': { title: String.raw`Pyramid $S.ABC$ has a base that is right-angled at $B$, $AB = 3$, $BC = 4$. The edge $SA \perp (ABC)$ and $SA = 2$. Find the volume $V$ of $S.ABC$.`, explanation: String.raw`Base area: $S_{ABC} = \frac{1}{2} AB \cdot BC = 6$. Volume: $V = \frac{1}{3} S_{ABC} \cdot SA = \frac{1}{3} \cdot 6 \cdot 2 = 4$.` },
      'q-18': { title: String.raw`Evaluate the integral $I = \int_0^2 (3x^2 - 2x)\,dx$.`, explanation: String.raw`An antiderivative is $F(x) = x^3 - x^2$, so $I = [x^3 - x^2]_0^2 = (8 - 4) - 0 = 4$.` },
      'q-19': { title: String.raw`In $Oxyz$, find the distance from $M(1; 2; -2)$ to the plane $(P): 2x + 2y - z + 6 = 0$.` },
      'q-20': { title: String.raw`Find the minimum value of $f(x) = x^4 - 2x^2 + 3$ on $[-2; 2]$.`, explanation: String.raw`Let $t = x^2 \in [0; 4]$. Then $g(t) = (t - 1)^2 + 2$, minimal at $t = 1$, i.e. $x = \pm 1$. So $f_{\min} = 2$.` },
      'q-21': { title: String.raw`In $Oxyz$, given $\overrightarrow{u} = (3; 4; 0)$. What is the length of $\overrightarrow{u}$?`, explanation: String.raw`$|\overrightarrow{u}| = \sqrt{3^2 + 4^2 + 0^2} = \sqrt{25} = 5$.` },
      'q-22': { title: String.raw`A box holds 3 red balls and 9 blue balls of equal size. One ball is drawn at random. Find the probability that it is red (give a decimal, e.g. 0.25).`, explanation: String.raw`There are $3 + 9 = 12$ balls and $3$ favourable outcomes, so $P = \frac{3}{12} = 0.25$.` },
    },
  },
  'exam-02': {
    title: 'Topic review: solid geometry & Oxyz vectors',
    subtitle: 'Build spatial reasoning and vector skills',
    subject: 'Mathematics',
    description: 'Problems on space vectors, planes, lines, spheres, distances and angles as they appear in the national graduation exam.',
  },
  'exam-03': {
    title: 'Practice paper 03 – based on the Ministry sample paper',
    subtitle: 'Sharpen your time management for the real exam',
    subject: 'Mathematics',
    description: 'A full-coverage Grade 12 paper: functions, integrals, Oxyz geometry, probability and statistics in the 2026 matrix.',
  },
};

export const ANNOUNCEMENT_EN: Record<string, AnnouncementTranslation> = {
  'ann-1': {
    title: 'How to use the practice papers',
    content: 'Practice as much as you can! Papers follow the 22-question structure (12 multiple choice, 4 true/false, 6 short answer) set by the Ministry of Education and Training.',
    author: 'School Board & Math Department – Tran Hung Dao High School',
  },
  'ann-2': {
    title: 'Online mock exam schedule – round 1, 2026-2027',
    content: 'The online mock exam is open from 08:00 Saturday to 21:00 Sunday each week. Sign in with your candidate number.',
    author: 'Tran Hung Dao High School',
  },
  'ann-3': {
    title: 'New: digital scratchpad and sharper math rendering',
    content: 'Formulas now render with KaTeX (vectors, integrals, radicals), and you can sketch by hand on the built-in scratchpad on desktop or phone.',
    author: 'IT & System Administration',
  },
};
