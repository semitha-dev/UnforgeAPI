import React from 'react';

const mockQuestions = [
    { id: 1, question: 'What is the project goal?', answer: 'To build a scalable web app.' },
    { id: 2, question: 'Who is the target audience?', answer: 'Developers and learners.' },
    { id: 3, question: 'What technologies are used?', answer: 'React, TypeScript, Next.js.' },
];

const ProjectQAPage = () => (
    <div>
        <h1>Project Q&amp;A</h1>
        <ul>
            {mockQuestions.map(q => (
                <li key={q.id}>
                    <strong>Q:</strong> {q.question}
                    <br />
                    <strong>A:</strong> {q.answer}
                </li>
            ))}
        </ul>
    </div>
);

export default ProjectQAPage;