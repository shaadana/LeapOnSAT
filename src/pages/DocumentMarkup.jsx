import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';
import MarkupCanvas from '@/components/student/MarkupCanvas';
import PDFAnnotationCanvas from '@/components/student/PDFAnnotationCanvas';
import FileUploader from '@/components/media/FileUploader';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

// Helper to check if a file is an image
const isImage = (fileName = '') => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
const isPdf = (fileName = '') => /\.pdf$/i.test(fileName);

export default function DocumentMarkup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('assignmentId');

  const [selectedAttachment, setSelectedAttachment] = useState(null);

  // Fetch the assignment details
  const { data: assignment, isLoading: isLoadingAssig } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const res = await base44.entities.Assignment.get(assignmentId);
      return res;
    },
    enabled: !!assignmentId,
  });

  // Fetch the user's progress for this assignment
  const { data: progress, isLoading: isLoadingProg } = useQuery({
    queryKey: ['progress', assignmentId, user?.id],
    queryFn: async () => {
      const res = await base44.entities.StudentAssignmentProgress.filter({
        assignment_id: assignmentId,
        student_id: user?.id
      });
      return res[0] || null;
    },
    enabled: !!assignmentId && !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (dataUrl) => {
        // 1. Convert base64 dataUrl to a File object
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `markup_${selectedAttachment?.name || 'document.png'}`, { type: 'image/png' });

        // 2. Upload using Core.UploadFile
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // 3. Update the StudentAssignmentProgress entity
        if (!progress) {
             await base44.entities.StudentAssignmentProgress.create({
                 assignment_id: assignmentId,
                 student_id: user.id,
                 status: 'completed',
                 progress_percentage: 100,
                 completed_at: new Date().toISOString(),
                 submitted_attachments: [{ url: file_url, name: file.name, type: 'image/png' }]
             });
        } else {
             const existingAttachments = progress.submitted_attachments || [];
             await base44.entities.StudentAssignmentProgress.update(progress.id, {
                 status: 'completed',
                 progress_percentage: 100,
                 completed_at: new Date().toISOString(),
                 submitted_attachments: [...existingAttachments, { url: file_url, name: file.name, type: 'image/png' }]
             });
        }
    },
    onSuccess: () => {
        toast.success("Assignment submitted successfully!");
        queryClient.invalidateQueries({ queryKey: ['progress', assignmentId, user?.id] });
        navigate(createPageUrl('Dashboard'));
    },
    onError: (err) => {
        toast.error("Failed to submit assignment: " + err.message);
    }
  });

  if (isLoadingAssig || isLoadingProg) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-stone-700">Assignment not found</h2>
        <Button className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>Go Back</Button>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-stone-700">You do not have access to this assignment</h2>
        <p className="text-stone-500 mt-2">This assignment was not assigned to you.</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>Go Back</Button>
      </div>
    );
  }

  const attachments = assignment.attachments || [];
  const imageAttachments = attachments.filter(a => isImage(a.name));
  const pdfAttachments = attachments.filter(a => isPdf(a.name));
  const otherAttachments = attachments.filter(a => !isImage(a.name) && !isPdf(a.name));
  
  const handleUploadSubmit = async (fileData) => {
    try {
      if (!progress) {
          await base44.entities.StudentAssignmentProgress.create({
              assignment_id: assignmentId,
              student_id: user.id,
              status: 'completed',
              progress_percentage: 100,
              completed_at: new Date().toISOString(),
              submitted_attachments: [fileData]
          });
      } else {
          const existingAttachments = progress.submitted_attachments || [];
          await base44.entities.StudentAssignmentProgress.update(progress.id, {
              status: 'completed',
              progress_percentage: 100,
              completed_at: new Date().toISOString(),
              submitted_attachments: [...existingAttachments, fileData]
          });
      }
      toast.success("Assignment submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ['progress', assignmentId, user?.id] });
      setSelectedAttachment(null);
    } catch (err) {
      toast.error("Failed to submit assignment: " + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(createPageUrl('Dashboard'))} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <Card className="border-2 border-emerald-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-stone-900">{assignment.title}</CardTitle>
              <p className="text-stone-600 mt-2">{assignment.description}</p>
            </div>
            {progress?.status === 'completed' && (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold bg-emerald-50 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    Submitted
                </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
           {/* If user already submitted, show their submissions */}
           {progress?.submitted_attachments?.length > 0 && (
             <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
               <h3 className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wider">Your Submitted Work</h3>
               <div className="flex flex-wrap gap-4">
                 {progress.submitted_attachments.map((sub, idx) => (
                    <a key={idx} href={sub.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors">
                        <img src={sub.url} alt={sub.name} className="w-24 h-24 object-cover rounded-md" />
                        <span className="text-xs text-stone-600 max-w-[96px] truncate" title={sub.name}>{sub.name}</span>
                    </a>
                 ))}
               </div>
               {/* Allow submitting another one if they want, but usually completed means done. Let's allow overriding. */}
               <div className="mt-4 pt-4 border-t border-blue-200">
                   <p className="text-sm text-blue-700">You can mark up and submit additional files if needed.</p>
               </div>
             </div>
           )}

          {!selectedAttachment ? (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-stone-800 mb-4">Select a document to view or mark up</h3>
                    {imageAttachments.length === 0 && pdfAttachments.length === 0 ? (
                        <p className="text-stone-500 italic">No document attached by the teacher.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {imageAttachments.map((att, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedAttachment(att)}
                                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                                >
                                    <div className="w-full aspect-video bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center">
                                        {/* Try to show a thumbnail if possible, or just an icon */}
                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
                                    </div>
                                    <span className="text-sm font-medium text-stone-700 line-clamp-2 w-full text-center" title={att.name}>{att.name}</span>
                                </button>
                            ))}
                            {pdfAttachments.map((att, idx) => (
                                <button
                                    key={`pdf-${idx}`}
                                    onClick={() => setSelectedAttachment(att)}
                                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                                >
                                    <div className="w-full aspect-video bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center">
                                        <FileText className="w-12 h-12 text-red-400" />
                                    </div>
                                    <span className="text-sm font-medium text-stone-700 line-clamp-2 w-full text-center" title={att.name}>{att.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {otherAttachments.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold text-stone-800 mb-3">Other Attached Files</h3>
                        <div className="flex flex-wrap gap-3">
                            {otherAttachments.map((att, idx) => (
                                <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm text-stone-700"
                                >
                                    <FileText className="w-4 h-4 text-stone-400" />
                                    <span className="max-w-[200px] truncate" title={att.name}>{att.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-stone-700">Marking up: {selectedAttachment.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAttachment(null)}>
                      Choose a different file
                  </Button>
              </div>
              
              {isImage(selectedAttachment.name) ? (
                <MarkupCanvas 
                  imageUrl={selectedAttachment.url} 
                  isLocked={selectedAttachment.locked}
                  onSave={(dataUrl) => submitMutation.mutate(dataUrl)} 
                  onCancel={() => setSelectedAttachment(null)}
                  isSaving={submitMutation.isPending}
                />
              ) : isPdf(selectedAttachment.name) ? (
                <PDFAnnotationCanvas 
                  pdfUrl={selectedAttachment.url}
                  isLocked={selectedAttachment.locked}
                  onSave={(dataUrl) => submitMutation.mutate(dataUrl)} 
                  onCancel={() => setSelectedAttachment(null)}
                  isSaving={submitMutation.isPending}
                />
               ) : (
                <div className="flex flex-col items-center gap-6 py-6">
                   <div className="w-full max-w-3xl h-[60vh] bg-stone-100 rounded-lg border border-stone-200 overflow-hidden">
                     <iframe src={selectedAttachment.url} className="w-full h-full" title={selectedAttachment.name} />
                   </div>
                   <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl w-full max-w-3xl text-center space-y-4">
                     <h4 className="font-semibold text-blue-900">Submit your work</h4>
                     <p className="text-sm text-blue-700">Please complete the assignment on paper or in your own app, then upload your final document or image here.</p>
                     <div className="flex justify-center">
                       <FileUploader onUploadComplete={handleUploadSubmit} />
                     </div>
                   </div>
                 </div>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
