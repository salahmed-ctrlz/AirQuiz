/**
 * AirQuiz - Classroom Assessment Platform
 * Exam Builder Component
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';

interface Question {
    id: number;
    text: string;
    options: string[];
    correct: string;
    time: number;
}

interface ExamBuilderProps {
    onSave: (exam: { title: string; questions: Question[] }) => void;
    onCancel: () => void;
}

export function ExamBuilder({ onSave, onCancel }: ExamBuilderProps) {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<Question[]>([
        { id: 1, text: '', options: ['', '', '', ''], correct: '', time: 30 }
    ]);

    const addQuestion = () => {
        const newId = Math.max(...questions.map(q => q.id), 0) + 1;
        setQuestions([...questions, { id: newId, text: '', options: ['', '', '', ''], correct: '', time: 30 }]);
    };

    const removeQuestion = (id: number) => {
        if (questions.length > 1) {
            setQuestions(questions.filter(q => q.id !== id));
        }
    };

    const updateQuestion = (id: number, field: keyof Question, value: any) => {
        setQuestions(questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const updateOption = (questionId: number, optionIndex: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleSave = () => {
        if (!title.trim()) return;

        const validQuestions = questions.filter(q =>
            q.text.trim() &&
            q.options.every(o => o.trim()) &&
            q.correct
        );

        if (validQuestions.length === 0) return;

        onSave({ title: title.trim(), questions: validQuestions });
    };

    const isValid = title.trim() && questions.some(q =>
        q.text.trim() &&
        q.options.every(o => o.trim()) &&
        q.correct
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Create New Exam</CardTitle>
                            <CardDescription>Build your quiz questions below</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onCancel}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Exam Title */}
                    <div className="space-y-2">
                        <Label htmlFor="examTitle" className="text-base font-semibold">Exam Title</Label>
                        <Input
                            id="examTitle"
                            placeholder="e.g. Midterm Exam - Chapter 5"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg h-12"
                        />
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Questions ({questions.length})</Label>
                            <Button variant="outline" size="sm" onClick={addQuestion}>
                                <Plus className="h-4 w-4 mr-1" /> Add Question
                            </Button>
                        </div>

                        {questions.map((question, qIndex) => (
                            <Card key={question.id} className="border-l-4 border-l-primary/50">
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center gap-1 text-muted-foreground pt-2">
                                            <GripVertical className="h-4 w-4" />
                                            <span className="font-bold text-lg">{qIndex + 1}</span>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            {/* Question Text */}
                                            <Input
                                                placeholder="Enter your question..."
                                                value={question.text}
                                                onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                                className="font-medium"
                                            />

                                            {/* Options Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {question.options.map((option, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-muted-foreground w-4">
                                                            {String.fromCharCode(65 + optIndex)}
                                                        </span>
                                                        <Input
                                                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                                            value={option}
                                                            onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                                            className="text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Correct Answer Selector */}
                                            <div className="flex items-center gap-4">
                                                <Label className="text-sm text-muted-foreground">Correct Answer:</Label>
                                                <Select
                                                    value={question.correct}
                                                    onValueChange={(value) => updateQuestion(question.id, 'correct', value)}
                                                >
                                                    <SelectTrigger className="w-48">
                                                        <SelectValue placeholder="Select correct answer" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {question.options.filter(o => o.trim()).map((option, idx) => (
                                                            <SelectItem key={idx} value={option}>
                                                                {String.fromCharCode(65 + idx)}: {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeQuestion(question.id)}
                                            disabled={questions.length === 1}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>

                {/* Footer Actions */}
                <div className="border-t p-4 bg-secondary/20 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {questions.filter(q => q.text.trim() && q.correct).length} valid questions
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!isValid} className="px-6">
                            <Save className="h-4 w-4 mr-2" /> Save Exam
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
