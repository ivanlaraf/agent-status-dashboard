import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFExportButtonProps {
  selectedDate: string;
}

const PDFExportButton = ({ selectedDate }: PDFExportButtonProps) => {
  const { toast } = useToast();

  const exportToPDF = async () => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we export your dashboard",
      });

      // Get the main dashboard content
      const element = document.querySelector('[data-pdf-content]') as HTMLElement;
      
      if (!element) {
        throw new Error('Dashboard content not found');
      }

      // Create canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // Center the image
      const x = (pdfWidth - scaledWidth) / 2;
      const y = (pdfHeight - scaledHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      // Add header text
      pdf.setFontSize(16);
      pdf.text('Amazon Connect Agent States - Daily History', 10, 15);
      pdf.setFontSize(12);
      pdf.text(`Report Date: ${selectedDate}`, 10, 25);

      pdf.save(`agent-states-report-${selectedDate}.pdf`);

      toast({
        title: "PDF Export Successful",
        description: "Your dashboard has been exported as PDF",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Export as PDF
    </Button>
  );
};

export default PDFExportButton;