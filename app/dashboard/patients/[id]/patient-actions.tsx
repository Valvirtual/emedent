'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Download, Trash2 } from 'lucide-react'

export default function PatientActions({ patientId, patientName }: { patientId: string; patientName: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleExport() {
    const [{ data: patient }, { data: conversations }, { data: appointments }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('conversations').select('*, messages(*)').eq('patient_id', patientId),
      supabase.from('appointments').select('*').eq('patient_id', patientId),
    ])

    const exportData = { patient, conversations, appointments, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paciente-${patientId}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportação gerada')
  }

  async function handleDelete() {
    setDeleting(true)

    const { data: conversations } = await supabase.from('conversations').select('id').eq('patient_id', patientId)
    const conversationIds = (conversations ?? []).map(c => c.id)

    if (conversationIds.length) {
      const { data: mediaMessages } = await supabase
        .from('messages')
        .select('media_path')
        .in('conversation_id', conversationIds)
        .not('media_path', 'is', null)

      const paths = (mediaMessages ?? []).map(m => m.media_path).filter(Boolean) as string[]
      if (paths.length) await supabase.storage.from('patient-media').remove(paths)

      await supabase.from('messages').delete().in('conversation_id', conversationIds)
      await supabase.from('conversations').delete().eq('patient_id', patientId)
    }

    await supabase.from('appointments').delete().eq('patient_id', patientId)
    await supabase.from('patients').delete().eq('id', patientId)

    setDeleting(false)
    setConfirmOpen(false)
    toast.success('Dados do paciente eliminados')
    router.push('/dashboard/patients')
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar dados (GDPR)
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Excluir dados
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir todos os dados de {patientName}?</DialogTitle>
            <DialogDescription>
              Esta ação remove definitivamente o registo do paciente, todas as conversas, mensagens, mídia e consultas associadas. Não pode ser desfeita — use apenas para responder a um pedido de exclusão (direito ao esquecimento, GDPR).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'A excluir...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
