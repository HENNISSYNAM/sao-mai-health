import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react"

interface CSVColumn {
  index: number
  name: string
  sampleValue: string
  mappedTo?: string
}

interface PreviewRow {
  [key: string]: string
}

export default function LabImport() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [columns, setColumns] = useState<CSVColumn[]>([])
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  const loincCodes = [
    { code: '33747-0', name: 'Dengue virus IgM Ab [Presence] in Serum by Immunoassay' },
    { code: '31996-4', name: 'Dengue virus IgG Ab [Presence] in Serum by Immunoassay' },
    { code: '25835-0', name: 'Dengue virus RNA [Presence] in Serum by NAA with probe detection' },
    { code: '6690-2', name: 'Leukocytes [#/volume] in Blood by Automated count' },
    { code: '777-3', name: 'Platelets [#/volume] in Blood by Automated count' },
    { code: '718-7', name: 'Hemoglobin [Mass/volume] in Blood' }
  ]

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0]
    if (csvFile) {
      setFile(csvFile)
      parseCSV(csvFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  })

  const parseCSV = async (file: File) => {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      toast.error("File CSV phải có ít nhất 2 dòng (header + data)")
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const firstDataRow = lines[1].split(',').map(v => v.trim().replace(/"/g, ''))

    const parsedColumns: CSVColumn[] = headers.map((header, index) => ({
      index,
      name: header,
      sampleValue: firstDataRow[index] || ''
    }))

    setColumns(parsedColumns)
    
    // Parse preview data (first 50 rows)
    const previewRows: PreviewRow[] = lines.slice(1, 51).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: PreviewRow = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      return row
    })

    setPreviewData(previewRows)
    setStep('mapping')
  }

  const handleColumnMapping = (columnIndex: number, loincCode: string) => {
    setColumns(prev => prev.map(col => 
      col.index === columnIndex 
        ? { ...col, mappedTo: loincCode }
        : col
    ))
  }

  const validateMapping = () => {
    const requiredMappings = ['patient_id', 'test_date']
    const mappedFields = columns.filter(col => col.mappedTo).map(col => col.mappedTo)
    
    const missingRequired = requiredMappings.filter(req => !mappedFields.includes(req))
    
    if (missingRequired.length > 0) {
      toast.error(`Thiếu mapping bắt buộc: ${missingRequired.join(', ')}`)
      return false
    }

    return true
  }

  const proceedToPreview = () => {
    if (validateMapping()) {
      setStep('preview')
    }
  }

  const processImport = async () => {
    if (!file) return

    setProgress(0)
    const mappedColumns = columns.filter(col => col.mappedTo)
    
    try {
      // Simulate processing with progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // TODO: Call RPC fn_lab_bulk_ingest
      console.log('Processing lab import with mappings:', mappedColumns)
      
      toast.success(`Đã import thành công ${previewData.length} kết quả xét nghiệm`)
      
      // Reset form
      setFile(null)
      setStep('upload')
      setColumns([])
      setPreviewData([])
      setProgress(0)
      
    } catch (error) {
      console.error('Import failed:', error)
      setErrors(['Lỗi khi import dữ liệu'])
      toast.error("Import thất bại")
    }
  }

  const downloadErrorReport = () => {
    const errorCSV = [
      'Dòng,Lỗi',
      ...errors.map((error, index) => `${index + 1},"${error}"`)
    ].join('\n')

    const blob = new Blob([errorCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lab-import-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (step === 'upload') {
    return (
      <div className="p-6 min-h-screen">
        <div className="space-y-6">
          <div>
          <h1 className="text-3xl font-bold text-foreground">Import kết quả xét nghiệm</h1>
          <p className="text-muted-foreground">Kéo thả file CSV hoặc click để chọn file</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Thả file CSV tại đây...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    Kéo thả file CSV hoặc click để chọn
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Chỉ chấp nhận file .csv (tối đa 10MB)
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Định dạng file mẫu:</h3>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">
                  patient_id,test_date,test_code,result_value,unit<br/>
                  P001,2024-01-15,33747-0,Positive,<br/>
                  P002,2024-01-15,6690-2,8500,cells/uL
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  if (step === 'mapping') {
    return (
      <div className="p-6 min-h-screen">
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapping cột dữ liệu</h1>
          <p className="text-muted-foreground">
            Ghép nối các cột trong file CSV với mã LOINC chuẩn
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              File: {file?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {columns.map((column) => (
                <div key={column.index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{column.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Ví dụ: {column.sampleValue}
                    </div>
                  </div>
                  <div className="w-80">
                    <Select 
                      value={column.mappedTo || ""} 
                      onValueChange={(value) => handleColumnMapping(column.index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mapping..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient_id">ID Bệnh nhân</SelectItem>
                        <SelectItem value="test_date">Ngày xét nghiệm</SelectItem>
                        {loincCodes.map((loinc) => (
                          <SelectItem key={loinc.code} value={loinc.code}>
                            <div>
                              <div className="font-medium">{loinc.code}</div>
                              <div className="text-xs text-muted-foreground">{loinc.name}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {column.mappedTo && (
                    <Badge variant="outline" className="shrink-0">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Đã map
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Quay lại
              </Button>
              <Button onClick={proceedToPreview}>
                Xem trước dữ liệu
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="p-6 min-h-screen">
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Xem trước dữ liệu</h1>
          <p className="text-muted-foreground">
            Kiểm tra 50 dòng đầu trước khi import
          </p>
        </div>

        {progress > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang xử lý...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dữ liệu preview ({previewData.length} dòng)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.filter(col => col.mappedTo).map((column) => (
                      <TableHead key={column.index}>
                        <div>
                          <div className="font-medium">{column.name}</div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {column.mappedTo}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {columns.filter(col => col.mappedTo).map((column) => (
                        <TableCell key={column.index}>
                          {row[column.name]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errors.length > 0 && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">Phát hiện lỗi dữ liệu</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                {errors.length > 5 && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Tải báo cáo lỗi đầy đủ
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Quay lại mapping
              </Button>
              <Button 
                onClick={processImport}
                disabled={progress > 0 && progress < 100}
              >
                {progress > 0 && progress < 100 ? 'Đang xử lý...' : 'Bắt đầu import'}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  return null
}