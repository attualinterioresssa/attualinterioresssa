"use client";
import Catalogo from "@/components/engenharia/Catalogo";

const CATEGORIAS = ["chapa", "fita"];

export default function Pagina() {
  return (
    <>
      <h2>Materiais: chapas e fitas</h2>
      <Catalogo categorias={CATEGORIAS} />
    </>
  );
}
