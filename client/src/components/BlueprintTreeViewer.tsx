"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen, Layers, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface BlueprintSubtopic {
  name: string;
  allocatedQuestions: number;
}

export interface BlueprintTopic {
  topic: string;
  subtopics: BlueprintSubtopic[];
}

export interface BlueprintBlock {
  name: string;
  subject: string;
  question_type: string;
  total_marks: number;
  instructions?: string[];
  topics: BlueprintTopic[];
}

export interface BlueprintSection {
  name: string;
  blocks: BlueprintBlock[];
}

export interface BlueprintTree {
  title: string;
  difficulty?: string;
  exam_type?: string;
  instructions?: string[];
  sections: BlueprintSection[];
}

interface BlueprintTreeViewerProps {
  blueprint: BlueprintTree;
  onChange: (updatedBlueprint: BlueprintTree) => void;
}

export function BlueprintTreeViewer({ blueprint, onChange }: BlueprintTreeViewerProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [collapsedBlocks] = useState<Record<string, boolean>>({});

  const toggleSectionCollapse = (sIdx: number) => {
    setCollapsedSections(prev => ({ ...prev, [sIdx]: !prev[sIdx] }));
  };

  const updateBlueprint = (updater: (draft: BlueprintTree) => void) => {
    const next = JSON.parse(JSON.stringify(blueprint)) as BlueprintTree;
    updater(next);
    onChange(next);
  };

  const handleUpdateBlockSubject = (sIdx: number, bIdx: number, newSubject: string) => {
    updateBlueprint(draft => { draft.sections[sIdx].blocks[bIdx].subject = newSubject; });
  };

  const handleUpdateTopic = (sIdx: number, bIdx: number, tIdx: number, newTitle: string) => {
    updateBlueprint(draft => { draft.sections[sIdx].blocks[bIdx].topics[tIdx].topic = newTitle; });
  };

  const handleAddTopic = (sIdx: number, bIdx: number) => {
    updateBlueprint(draft => {
      draft.sections[sIdx].blocks[bIdx].topics.push({
        topic: "New Topic",
        subtopics: [{ name: "New Subtopic", allocatedQuestions: 1 }]
      });
    });
  };

  const handleDeleteTopic = (sIdx: number, bIdx: number, tIdx: number) => {
    updateBlueprint(draft => { draft.sections[sIdx].blocks[bIdx].topics.splice(tIdx, 1); });
  };

  const handleUpdateSubtopicName = (sIdx: number, bIdx: number, tIdx: number, stIdx: number, newName: string) => {
    updateBlueprint(draft => { draft.sections[sIdx].blocks[bIdx].topics[tIdx].subtopics[stIdx].name = newName; });
  };

  const handleUpdateSubtopicCount = (sIdx: number, bIdx: number, tIdx: number, stIdx: number, delta: number) => {
    updateBlueprint(draft => {
      const current = draft.sections[sIdx].blocks[bIdx].topics[tIdx].subtopics[stIdx].allocatedQuestions || 0;
      draft.sections[sIdx].blocks[bIdx].topics[tIdx].subtopics[stIdx].allocatedQuestions = Math.max(0, current + delta);
    });
  };

  const handleAddSubtopic = (sIdx: number, bIdx: number, tIdx: number) => {
    updateBlueprint(draft => {
      draft.sections[sIdx].blocks[bIdx].topics[tIdx].subtopics.push({ name: "New Subtopic", allocatedQuestions: 1 });
    });
  };

  const handleDeleteSubtopic = (sIdx: number, bIdx: number, tIdx: number, stIdx: number) => {
    updateBlueprint(draft => { draft.sections[sIdx].blocks[bIdx].topics[tIdx].subtopics.splice(stIdx, 1); });
  };

  const totalQuestions = blueprint.sections.reduce((sAcc, sec) => {
    return sAcc + sec.blocks.reduce((bAcc, block) => {
      return bAcc + block.topics.reduce((tAcc, top) => {
        return tAcc + top.subtopics.reduce((stAcc, st) => stAcc + (st.allocatedQuestions || 0), 0);
      }, 0);
    }, 0);
  }, 0);

  return (
    <div className="space-y-6 bg-[#0f0f11] border border-white/10 rounded-2xl p-6 shadow-2xl">
      {/* Header Banner */}
      <div className="bg-[#14151f] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block mb-1">
            Exam Blueprint
          </span>
          <h3 className="text-xl font-extrabold text-white">{blueprint.title}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Each block is subject-scoped. Review and adjust blocks, topics, subtopics, and question counts below.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0a0d] border border-white/10 px-4 py-2.5 rounded-xl shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-bold text-white">{totalQuestions} Questions</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold text-white">{blueprint.sections.length} Sections</span>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {blueprint.sections.map((section, sIdx) => {
          const isCollapsed = collapsedSections[sIdx];
          const sectionQuestionsCount = section.blocks.reduce((bAcc, block) => {
            return bAcc + block.topics.reduce((tAcc, top) => {
              return tAcc + top.subtopics.reduce((stAcc, st) => stAcc + (st.allocatedQuestions || 0), 0);
            }, 0);
          }, 0);

          return (
            <div key={sIdx} className="bg-[#12131a] border border-white/10 rounded-xl overflow-hidden shadow-lg">
              {/* Section Header */}
              <div className="bg-[#181924] px-5 py-3.5 flex items-center justify-between border-b border-white/5 select-none">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSectionCollapse(sIdx)}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white p-0">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <span className="text-xs font-extrabold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30">
                    Section {String.fromCharCode(65 + sIdx)}
                  </span>
                  <h4 className="text-sm font-bold text-white">{section.name}</h4>
                  <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">
                    {section.blocks.length} Blocks
                  </span>
                </div>
                <span className="text-xs font-semibold text-zinc-300">
                  {sectionQuestionsCount} Questions
                </span>
              </div>

              {/* Blocks */}
              {!isCollapsed && (
                <div className="p-5 space-y-5">
                  {section.blocks.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic text-center py-4">No blocks in this section yet.</p>
                  ) : (
                    section.blocks.map((blockObj, bIdx) => {
                      const blockCollapsed = collapsedBlocks[`${sIdx}-${bIdx}`];
                      const blockQuestionsCount = blockObj.topics.reduce((tAcc, top) => {
                        return tAcc + top.subtopics.reduce((stAcc, st) => stAcc + (st.allocatedQuestions || 0), 0);
                      }, 0);

                      return (
                        <div key={bIdx} className="bg-[#151622] border border-white/10 rounded-xl overflow-hidden shadow-sm">
                          {/* Block Header */}
                          <div className="bg-[#1c1e2b] px-4 py-3 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
                              <Input
                                value={blockObj.name}
                                onChange={e => updateBlueprint(d => { d.sections[sIdx].blocks[bIdx].name = e.target.value; })}
                                placeholder="Block name..."
                                className="bg-[#0b0c10] border border-white/10 text-white font-bold text-sm h-8 w-44 focus:border-purple-500"
                              />
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-[10px] font-semibold text-zinc-400 uppercase shrink-0">Subject</span>
                                <Input
                                  value={blockObj.subject}
                                  onChange={e => handleUpdateBlockSubject(sIdx, bIdx, e.target.value)}
                                  placeholder="Subject..."
                                  className="bg-[#0b0c10] border border-white/10 text-white text-sm h-8 flex-1 focus:border-purple-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">
                                {blockObj.question_type || "mcq"}
                              </span>
                              <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/30">
                                {blockQuestionsCount} Questions
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddTopic(sIdx, bIdx)}
                                className="bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-bold h-8 px-3"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Topic
                              </Button>
                            </div>
                          </div>

                          {/* Topics Container */}
                          {!blockCollapsed && (
                            <div className="p-4 space-y-4">
                              {blockObj.topics.length === 0 ? (
                                <p className="text-xs text-zinc-500 italic text-center py-4">No topics in this block yet.</p>
                              ) : (
                                blockObj.topics.map((topicObj, tIdx) => {
                                  const topicQuestionsCount = topicObj.subtopics.reduce((stAcc, st) => stAcc + (st.allocatedQuestions || 0), 0);

                                  return (
                                    <div key={tIdx} className="bg-[#0f1018] border border-white/5 rounded-xl p-4 space-y-3">
                                      {/* Topic Row */}
                                      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2 flex-1">
                                          <BookOpen className="h-4 w-4 text-orange-400 shrink-0" />
                                          <Input
                                            value={topicObj.topic}
                                            onChange={e => handleUpdateTopic(sIdx, bIdx, tIdx, e.target.value)}
                                            placeholder="Enter topic title..."
                                            className="bg-[#0b0c10] border border-white/10 text-white font-bold text-sm h-9 flex-1 focus:border-orange-500"
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/30 shrink-0">
                                            {topicQuestionsCount} Questions
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleAddSubtopic(sIdx, bIdx, tIdx)}
                                            className="text-xs text-orange-300 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 h-8 px-2.5"
                                          >
                                            <Plus className="h-3.5 w-3.5 mr-1" /> Subtopic
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteTopic(sIdx, bIdx, tIdx)}
                                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Subtopics Rows */}
                                      <div className="space-y-2 pl-4">
                                        {topicObj.subtopics.map((stObj, stIdx) => (
                                          <div key={stIdx} className="flex items-center justify-between gap-3 bg-[#0b0c10] border border-white/5 rounded-lg px-3.5 py-2 group hover:border-white/20 transition-all">
                                            <span className="text-orange-400 text-xs font-bold">•</span>
                                            <Input
                                              value={stObj.name}
                                              onChange={e => handleUpdateSubtopicName(sIdx, bIdx, tIdx, stIdx, e.target.value)}
                                              placeholder="Subtopic name..."
                                              className="bg-transparent border-none text-xs text-zinc-100 font-medium h-7 flex-1 focus:ring-0 focus:outline-none focus:text-white"
                                            />
                                            <div className="flex items-center gap-2 shrink-0">
                                              <div className="flex items-center bg-[#151624] border border-white/10 rounded-md overflow-hidden h-7">
                                                <button
                                                  onClick={() => handleUpdateSubtopicCount(sIdx, bIdx, tIdx, stIdx, -1)}
                                                  className="px-2 text-xs text-zinc-400 hover:text-white hover:bg-white/10 h-full font-bold transition-colors"
                                                >-</button>
                                                <span className="px-2.5 text-xs font-bold text-orange-400 border-x border-white/10 min-w-[70px] text-center">
                                                  {stObj.allocatedQuestions || 0} Questions
                                                </span>
                                                <button
                                                  onClick={() => handleUpdateSubtopicCount(sIdx, bIdx, tIdx, stIdx, 1)}
                                                  className="px-2 text-xs text-zinc-400 hover:text-white hover:bg-white/10 h-full font-bold transition-colors"
                                                >+</button>
                                              </div>
                                              <button
                                                onClick={() => handleDeleteSubtopic(sIdx, bIdx, tIdx, stIdx)}
                                                className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
